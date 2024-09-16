import React, { useState, useEffect, useRef } from "react";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const websocketRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    websocketRef.current = new WebSocket("ws://localhost:8000/ws");

    websocketRef.current.onmessage = (event) => {
      const message = event.data;
      if (message === "[END]") {
        // End of the response stream
        setMessages((prev) => [...prev, { user: input, bot: "Completed" }]);
      } else {
        setMessages((prev) => [...prev, { user: input, bot: message }]);
      }
    };

    websocketRef.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    // Cleanup the WebSocket connection when the component unmounts
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [input]);

  const sendMessage = () => {
    if (websocketRef.current && input) {
      websocketRef.current.send(input);
      setMessages((prev) => [...prev, { user: input, bot: "..." }]);
      setInput("");
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
