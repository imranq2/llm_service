from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from langchain_community.llms.OpenAI import OpenAI
from langchain.chains.ConversationChain import ConversationChain

import asyncio

app = FastAPI()

# Initialize LangChain conversation chain
llm = OpenAI(temperature=0.9)
conversation = ConversationChain(llm=llm)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive the user's message
            user_input = await websocket.receive_text()

            # Stream response from the LangChain model in chunks
            async for chunk in stream_response(user_input):
                await websocket.send_text(chunk)

            # Indicate completion
            await websocket.send_text("[END]")
    except WebSocketDisconnect:
        print("Client disconnected")


async def stream_response(user_input: str):
    # Here, simulate streaming with a delay between chunks
    response = conversation.run(user_input)
    for i in range(0, len(response), 10):  # Send data in chunks
        yield response[i:i + 10]
        await asyncio.sleep(0.1)  # Simulate delay for streaming
