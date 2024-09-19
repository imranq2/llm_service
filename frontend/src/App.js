import React, {useEffect, useState} from "react";
import {
  Box,
  Button,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

// Fetch the environment variable for WELL_KNOWN_URL
const WELL_KNOWN_URL = process.env.REACT_APP_WELL_KNOWN_URL;
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
// const CLIENT_SECRET = process.env.REACT_APP_CLIENT_SECRET;
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

  // Fetch the .well-known OpenID Connect configuration
  const fetchWellKnownConfig = async () => {
    const response = await fetch(WELL_KNOWN_URL);
    return await response.json();
  };

  /* PKCE Authorization Flow:
    1. Client Generates a Code Verifier:
      The client (React app, mobile app, etc.) generates a code_verifier, which is a random string
      between 43 and 128 characters. This will be used later in the process to verify the authenticity
      of the request.
     2. Client Derives a Code Challenge:
      The client creates a code_challenge by hashing the code_verifier using SHA-256 and then Base64 URL encoding
      the result (to make it safe for URLs). If the client doesn't want to use SHA-256, it can also use the plain
      code_verifier as the challenge.
     3. Client Sends Authorization Request:
      The client redirects the user to the authorization server (e.g., Keycloak) with the following parameters in the URL:
          response_type=code: Indicates this is an authorization code flow.
          client_id: The client’s ID in the authorization server.
          redirect_uri: Where the authorization server should send the user back after authentication.
          code_challenge: The derived code challenge.
          code_challenge_method: Set to S256 to indicate SHA-256 is used, or plain if no hashing is used.
          scope: The scope of access requested (e.g., openid, profile).
     4. User Authenticates:
      The user is prompted to log in to the authorization server (e.g., Keycloak). After successful authentication,
      the authorization server generates an authorization code.
     5. Authorization Server Redirects Back:
      The authorization server redirects the user back to the client’s redirect_uri with the authorization code
       included in the URL.
     6. Client Exchanges Code for Access Token:
      The client now takes the authorization code and exchanges it for an access token by making a POST request to
      the authorization server’s token endpoint. This request includes:
        grant_type=authorization_code: Specifies the grant type.
        client_id: The client ID.
        code: The authorization code obtained in step 5.
        redirect_uri: Must be the same as the one used in step 3.
        code_verifier: The original random string generated in step 1.
      7. Authorization Server Verifies the Code Challenge:
        The authorization server retrieves the original code_challenge from step 3 and computes a new hash
        from the code_verifier received in step 6. It compares the computed challenge with the stored challenge:
            If the computed challenge matches the stored challenge, the server issues an access token.
            If the verification fails, the request is rejected.
      8. Client Receives Access Token:
        If the code_verifier is valid and the exchange is successful, the authorization server responds with an
        access token and (optionally) a refresh token.
*/

  const login = async () => {
    const config = await fetchWellKnownConfig();

    // Generate PKCE code verifier and challenge
    const newCodeVerifier = "rnnc29a4Y3rno5wBJtzeBDjGZ4_8cq3phG4PpnaIs7s";

    // Store the code verifier in sessionStorage for later use
    sessionStorage.setItem("codeVerifier", newCodeVerifier);

    const codeChallenge = await generateCodeChallenge(newCodeVerifier); // Generate a code challenge

     const authUrl = `${config.authorization_endpoint}` +
      `?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=${RESPONSE_TYPE}` +
      `&scope=${SCOPE}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;

    window.alert(`Authorization URL: ${authUrl}, codeVerifier: ${newCodeVerifier}`);
    // Redirect to Keycloak's authorization endpoint with PKCE parameters
    window.location.href = authUrl;
  };

  // Handle the OAuth2 callback and exchange the authorization code for tokens
  const handleCallback = async () => {
    const code = new URLSearchParams(window.location.search).get("code");

    // Retrieve the code verifier from sessionStorage
    const storedCodeVerifier = sessionStorage.getItem("codeVerifier");

    console.log(`Authorization code: ${code}, codeVerifier: ${storedCodeVerifier}`);
    if (code && storedCodeVerifier) {
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
          //client_secret: CLIENT_SECRET,
          code_verifier: "rnnc29a4Y3rno5wBJtzeBDjGZ4_8cq3phG4PpnaIs7s", // Use the PKCE code_verifier from sessionStorage
        }),
      });

      const tokenData = await response.json();
      setToken(tokenData.access_token); // Store the access token

      // Clear query params and remove codeVerifier from sessionStorage after successful login
      window.history.replaceState({}, document.title, window.location.pathname);
      sessionStorage.removeItem("codeVerifier");
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
              onKeyUp={(e) => e.key === "Enter" && sendMessage()} // Send message on Enter key
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
