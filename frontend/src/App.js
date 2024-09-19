import React, { useState, useEffect } from "react";
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

// Fetch the environment variable for WELL_KNOWN_URL
const WELL_KNOWN_URL = process.env.REACT_APP_WELL_KNOWN_URL;
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const REDIRECT_URI = window.location.origin + "/callback"; // Where Keycloak redirects after login
const RESPONSE_TYPE = "code";
const SCOPE = "openid profile email";
const LOGOUT_REDIRECT_URI = window.location.origin; // Where to redirect after logout

// Utility function to generate a random string (code_verifier)
const generateRandomString = (length) => {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array); // Web Crypto API
  return Array.from(array, (byte) => ("0" + byte.toString(16)).slice(-2)).join("");
};

// Function to generate the PKCE code challenge based on code verifier using Web Crypto API
const generateCodeChallenge = async (codeVerifier) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data); // Web Crypto API for SHA-256 hashing
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [token, setToken] = useState(null); // To store the token
  const [codeVerifier, setCodeVerifier] = useState(null); // PKCE Code Verifier

  // Fetch the .well-known OpenID Connect configuration
  const fetchWellKnownConfig = async () => {
    const response = await fetch(WELL_KNOWN_URL);
    const config = await response.json();
    return config;
  };

  // Redirect to Keycloak's login page for authentication with PKCE
  const login = async () => {
    const config = await fetchWellKnownConfig();

    // Generate PKCE code verifier and challenge
    const newCodeVerifier = generateRandomString(128); // Generate a code verifier
    setCodeVerifier(newCodeVerifier);
    const codeChallenge = await generateCodeChallenge(newCodeVerifier); // Generate a code challenge

    // Redirect to Keycloak's authorization endpoint with PKCE parameters
    const authorizationUrl = `${config.authorization_endpoint}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=${SCOPE}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    window.location.href = authorizationUrl;
  };

  // Handle the OAuth2 callback and exchange the authorization code for tokens
  const handleCallback = async () => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code && codeVerifier) {
      const config = await fetchWellKnownConfig();
      const tokenUrl = config.token_endpoint;

      // Exchange authorization code and PKCE code_verifier for tokens
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          code_verifier: codeVerifier, // Use the PKCE code_verifier
        }),
      });
      const tokenData = await response.json();
      setToken(tokenData.access_token); // Store the access token
      window.history.replaceState({}, document.title, window.location.pathname); // Clear query params
    }
  };

  // Logout function
  const logout = async () => {
    const config = await fetchWellKnownConfig();
    const logoutUrl = `${config.end_session_endpoint}?client_id=${CLIENT_ID}&post_logout_redirect_uri=${LOGOUT_REDIRECT_URI}`;
    setToken(null); // Clear the token from state
    window.location.href = logoutUrl; // Redirect to Keycloak logout
  };

  useEffect(() => {
    handleCallback(); // Handle callback when the page loads
  }, []);

  // Function to send the message to the backend
  const sendMessage = async () => {
    if (!token) {
      alert("You must log in first!");
      return;
    }

    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Attach the token for authentication
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

      {/* Show Login button if not authenticated */}
      {!token ? (
        <Box textAlign="center" mt={4}>
          <Button variant="contained" color="primary" onClick={login}>
            Log in with Keycloak
          </Button>
        </Box>
      ) : (
        <>
          {/* Logout Button */}
          <Box textAlign="center" mt={4}>
            <Button variant="contained" color="secondary" onClick={logout}>
              Logout
            </Button>
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
        </>
      )}
    </Container>
  );
}

export default App;
