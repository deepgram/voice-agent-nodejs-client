import "log-timestamp";
import WebSocket from "ws";
import mic from "mic";
import AudioPlayer from "./audio-player.js";


const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 48000;

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
            provider: "open_ai",
            model: "gpt-3.5-turbo",
            instructions: "You are a helpful assistant."
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

ws.on("message", function message(data, isBinary) {
    if (isBinary) {
        audioPlayer.play(data);
    } else {
        console.log(`Got text message: ${data}`);

        if (JSON.parse(data)["type"] === "UserStartedSpeaking") {
            audioPlayer.stop();
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
