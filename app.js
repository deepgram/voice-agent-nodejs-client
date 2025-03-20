import "log-timestamp";
import WebSocket from "ws";
import mic from "mic";
import AudioPlayer from "./audio-player.js";


const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 48000;

// Example customer database (in-memory for demo purposes)
const customers = {
    'CUST0042': {
        name: 'John Smith',
        email: 'john@example.com',
        phone: '+15551234567'
    }
};

const FUNCTION_DEFINITIONS = [
    {
        name: 'find_customer',
        description: 'Look up a customer\'s account information using their ID, phone, or email.',
        parameters: {
            type: 'object',
            properties: {
                customer_id: {
                    type: 'string',
                    description: 'Customer\'s ID in CUSTXXXX format'
                },
                phone: {
                    type: 'string',
                    description: 'Phone number with country code in +1XXXXXXXXXX format'
                },
                email: {
                    type: 'string',
                    description: 'Email address'
                }
            }
        }
    }
];

// Function implementations
const functionMap = {
    find_customer: async (params) => {
        console.log('Looking up customer with params:', params);
        
        let customer = null;
        if (params.customer_id) {
            customer = customers[params.customer_id];
        } else if (params.phone) {
            customer = Object.values(customers).find(c => c.phone === params.phone);
        } else if (params.email) {
            customer = Object.values(customers).find(c => c.email === params.email);
        }

        if (customer) {
            return `Found customer: ${customer.name}. Email: ${customer.email}, Phone: ${customer.phone}`;
        } else {
            return "No customer found with the provided information.";
        }
    }
};

const CONFIG = {
    type: "SettingsConfiguration",
    audio: {
        input: {
            encoding: "linear16",
            sample_rate: INPUT_SAMPLE_RATE
        },
        output: {
            encoding: "linear16",
            sample_rate: OUTPUT_SAMPLE_RATE,
            container: "none",
        }
    },
    agent: {
        listen: {
            model: "nova-2"
        },
        think: {
            provider: {
                type: "open_ai"
            },
            model: "gpt-4o-mini",
            instructions: "You are a helpful customer service assistant. You can look up customer information using their ID, phone number, or email address.",
            functions: FUNCTION_DEFINITIONS
        },
        speak: {
            model: "aura-asteria-en"
        }
    }
}

const audioPlayer = new AudioPlayer(OUTPUT_SAMPLE_RATE);

const ws = new WebSocket(`${getEnv("VOICE_AGENT_URL")}`, {
    headers: { authorization: `token ${getEnv("DEEPGRAM_API_KEY")}` }
});

ws.on("open", function open() {
    ws.send(JSON.stringify(CONFIG));
    startStreamingFromMicrophone(ws);
});

ws.on("message", async function message(data, isBinary) {
    if (isBinary) {
        audioPlayer.play(data);
    } else {
        const message = JSON.parse(data);
        console.log(`Got text message:`, message);

        if (message.type === "UserStartedSpeaking") {
            audioPlayer.stop();
        } else if (message.type === "FunctionCallRequest") {
            try {
                const func = functionMap[message.function_name];
                if (!func) {
                    throw new Error(`Function ${message.function_name} not implemented`);
                }

                const result = await func(message.input);
                console.log(`Function ${message.function_name} result:`, result);

                ws.send(JSON.stringify({
                    type: "FunctionCallResponse",
                    function_call_id: message.function_call_id,
                    output: result
                }));
            } catch (error) {
                console.error(`Error executing function ${message.function_name}:`, error);
                ws.send(JSON.stringify({
                    type: "FunctionCallResponse",
                    function_call_id: message.function_call_id,
                    error: error.message
                }));
            }
        }
    }
});

function startStreamingFromMicrophone(websocket) {
    var micInstance = mic({ rate: INPUT_SAMPLE_RATE, channels: 1 });
    var micInputStream = micInstance.getAudioStream();

    micInputStream.on('data', function (data) {
        websocket.send(data);
    });

    micInputStream.on('error', function (err) {
        console.log("Microphone error: " + err);
    });

    micInstance.start();
}

function getEnv(name) {
    let val = process.env[name];
    if ((val === undefined) || (val === null)) {
        throw (`Please set the environment variable: ${name}`);
    }
    return val;
}
