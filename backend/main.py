from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage

from langchain_openai import OpenAI

app = FastAPI()

# Initialize LangChain conversation chain
model = OpenAI(temperature=0.9)

from langchain_core.chat_history import (
    BaseChatMessageHistory,
    InMemoryChatMessageHistory,
)
from langchain_core.runnables.history import RunnableWithMessageHistory

store = {}


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]


with_message_history = RunnableWithMessageHistory(model, get_session_history)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive the user's message
            user_input = await websocket.receive_text()

            print(f"Received message: {user_input}")

            # Stream response from the LangChain model in chunks
            async for chunk in stream_response(user_input):
                await websocket.send_text(chunk)

            # Indicate completion
            await websocket.send_text("[END]")
    except WebSocketDisconnect:
        print("Client disconnected")


async def stream_response(user_input: str):
    print(f"Received user input: {user_input}")

    config = {"configurable": {"session_id": "abc2"}}

    response = with_message_history.invoke(
        [HumanMessage(content=user_input)],
        config=config,
    )

    print(f"Output: {response}")

    yield response

    # for r in with_message_history.stream(
    #         {
    #             "messages": [HumanMessage(content="hi! I'm todd. tell me a joke")],
    #             "language": "English",
    #         },
    #         config=config,
    # ):
    #     print(r.content, end="|")

    # Get the LLM response using RunnableWithMessageHistory
    # response = await conversation.arun(user_input)

    # Simulate streaming by sending chunks of the response
    # chunk_size = 50  # Define the size of the chunks to simulate streaming
    # for i in range(0, len(response), chunk_size):
    #     yield response[i:i + chunk_size]  # Send chunk of the response

    # Append the assistant's response to the conversation history
    # memory.append({"role": "assistant", "content": response})
