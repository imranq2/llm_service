import React, { useState } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  // Function to send the message to the backend
  const sendMessage = async () => {
    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: input }),
    });
    const data = await response.json();
    setMessages([...messages, { user: input, bot: data.response }]);
    setInput(""); // Clear the input field
  };

  return (
    <Container maxWidth="md">
      <Box mt={4} mb={2}>
        <Typography variant="h4" component="h1" align="center">
          Chat with LangChain
        </Typography>
      </Box>

      {/* Chat window */}
      <Paper elevation={3} sx={{ padding: 2, height: "400px", overflowY: "auto" }}>
        <List>
          {messages.map((msg, index) => (
            <React.Fragment key={index}>
              <ListItem>
                <ListItemText
                  primary={<strong>User:</strong>}
                  secondary={msg.user}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={<strong>Bot:</strong>}
                  secondary={msg.bot}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Input field and send button */}
      <Box mt={2} display="flex" alignItems="center">
        <TextField
          fullWidth
          label="Type your message"
          variant="outlined"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()} // Send message on Enter key
          multiline  // Allow multiple lines
          minRows={2}   // Minimum number of rows
          maxRows={5}   // Maximum number of rows
        />
        <Button
          variant="contained"
          color="primary"
          onClick={sendMessage}
          sx={{ marginLeft: 2 }}
        >
          Send
        </Button>
      </Box>
    </Container>
  );
}

export default App;
