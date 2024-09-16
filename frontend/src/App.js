import React, { useState, useEffect, useRef } from "react";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const websocketRef = useRef(null);

  useEffect(() => {
    console.log("Initializing WebSocket connection...");

    // Initialize WebSocket connection
    websocketRef.current = new WebSocket("ws://localhost:8000/ws");

    // Log when the WebSocket connection is opened
    websocketRef.current.onopen = () => {
      console.log("WebSocket connection opened successfully.");
    };

    // Handle incoming messages (i.e., streamed chunks from the backend)
    websocketRef.current.onmessage = (event) => {
      const message = event.data;
      console.log("Received message from server:", message);

      if (message === "[END]") {
        console.log("End of message stream received.");
        // Mark the bot response as "Completed"
        setMessages((prev) => [...prev, { user: input, bot: "Completed" }]);
      } else {
        // Append the streamed output to the bot's response
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          const newBotMessage = lastMessage.bot + message;
          console.log("Appending chunk to the bot message:", message);
          const updatedMessages = [...prev.slice(0, -1), { user: lastMessage.user, bot: newBotMessage }];
          return updatedMessages;
        });
      }
    };

    // Log when the WebSocket connection is closed
    websocketRef.current.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    // Log errors if the WebSocket encounters any
    websocketRef.current.onerror = (error) => {
      console.error("WebSocket error occurred:", error);
    };

    // Cleanup the WebSocket connection when the component unmounts
    return () => {
      if (websocketRef.current) {
        console.log("Cleaning up WebSocket connection...");
        websocketRef.current.close();
      }
    };
  }, [input]);

  const sendMessage = () => {
    if (websocketRef.current && input) {
      console.log("Sending message to server:", input);
      websocketRef.current.send(input);

      // Add a new message placeholder for the bot's response
      setMessages((prev) => [...prev, { user: input, bot: "" }]);
      setInput("");
    } else {
      console.warn("WebSocket is not connected or input is empty.");
    }
  };

  return (
    <div className="App">
      <h1>Chat with LangChain (WebSocket Streaming)</h1>
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index}>
            <p><strong>User:</strong> {msg.user}</p>
            <p><strong>Bot:</strong> {msg.bot}</p>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default App;
