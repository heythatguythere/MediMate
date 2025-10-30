package com.medimate.app.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import javafx.application.Platform;
import javafx.scene.control.Alert;

import java.awt.Desktop;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.lang.reflect.Type;
import java.net.HttpURLConnection;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URI;
import java.net.URL;
import java.util.Map;
import java.util.function.Consumer;

public class GoogleAuthService {
    
    private static final String CLIENT_ID = "REDACTED_GOOGLE_CLIENT_ID";
    private static final String REDIRECT_URI = "http://localhost:8888/callback";
    private static final String BACKEND_URL = "http://localhost:8081";
    
    private final Gson gson = new Gson();
    
    public void signInWithGoogle(Consumer<Map<String, Object>> onSuccess, Consumer<String> onError) {
        new Thread(() -> {
            try {
                // Build OAuth URL
                String authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                    "client_id=" + CLIENT_ID +
                    "&redirect_uri=" + REDIRECT_URI +
                    "&response_type=token id_token" +
                    "&scope=openid%20email%20profile" +
                    "&nonce=random_nonce";
                
                // Open browser
                if (Desktop.isDesktopSupported()) {
                    Desktop.getDesktop().browse(new URI(authUrl));
                }
                
                // Start local server to receive callback
                ServerSocket serverSocket = new ServerSocket(8888);
                Socket socket = serverSocket.accept();
                
                BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                String line = in.readLine();
                
                // Send response to browser
                String response = "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: text/html\r\n" +
                    "\r\n" +
                    "<html><body><h1>Authentication successful!</h1>" +
                    "<p>You can close this window and return to MediMate.</p>" +
                    "<script>" +
                    "const hash = window.location.hash.substring(1);" +
                    "const params = new URLSearchParams(hash);" +
                    "const idToken = params.get('id_token');" +
                    "if (idToken) {" +
                    "  fetch('http://localhost:8888/token', {" +
                    "    method: 'POST'," +
                    "    body: idToken" +
                    "  });" +
                    "}" +
                    "</script>" +
                    "</body></html>";
                
                OutputStream out = socket.getOutputStream();
                out.write(response.getBytes());
                out.flush();
                
                // Wait for token POST
                Socket tokenSocket = serverSocket.accept();
                BufferedReader tokenIn = new BufferedReader(new InputStreamReader(tokenSocket.getInputStream()));
                StringBuilder tokenData = new StringBuilder();
                String tokenLine;
                boolean readingBody = false;
                
                while ((tokenLine = tokenIn.readLine()) != null) {
                    if (tokenLine.isEmpty()) {
                        readingBody = true;
                        continue;
                    }
                    if (readingBody) {
                        tokenData.append(tokenLine);
                        break;
                    }
                }
                
                String idToken = tokenData.toString();
                
                // Send token to backend for verification
                URL url = new URL(BACKEND_URL + "/api/auth/google/verify");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                
                String jsonInput = "{\"idToken\":\"" + idToken + "\"}";
                OutputStream os = conn.getOutputStream();
                os.write(jsonInput.getBytes());
                os.flush();
                
                int responseCode = conn.getResponseCode();
                if (responseCode == 200) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder result = new StringBuilder();
                    String resultLine;
                    while ((resultLine = br.readLine()) != null) {
                        result.append(resultLine);
                    }
                    
                    Type type = new TypeToken<Map<String, Object>>(){}.getType();
                    Map<String, Object> authResponse = gson.fromJson(result.toString(), type);
                    
                    Platform.runLater(() -> onSuccess.accept(authResponse));
                } else {
                    Platform.runLater(() -> onError.accept("Authentication failed"));
                }
                
                tokenSocket.close();
                socket.close();
                serverSocket.close();
                
            } catch (Exception e) {
                e.printStackTrace();
                Platform.runLater(() -> onError.accept("Error: " + e.getMessage()));
            }
        }).start();
    }
}
