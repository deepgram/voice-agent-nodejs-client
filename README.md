# voice-agent-nodejs-client

This is a NodeJS client for interacting with Deepgram's Voice Agent API.

## Instructions

1. Set environment variables with your Deepgram API key and Voice Agent URL:

    ```
    export DEEPGRAM_API_KEY=<your-key-here>
    export VOICE_AGENT_URL=<your-url-here>
    ```

2. Install dependencies:

    ```
    npm install
    ```

3. Run the app:

    ```
    node app.js
    ```

4. Start talking into your mic!

The app includes an example function call where you can ask the system to look-up a customer's information by ID, phone, or email.  The customer details are:
```
CUST0042: John Smith, Email: john@example.com, Phone: +15551234567
```

## Audio Issues?

Make sure your system meets the requirements for the [microphone](https://www.npmjs.com/package/mic#installation) and [playback](https://www.npmjs.com/package/speaker) libraries used by the client.
