package com.medimate.app.ui;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.medimate.app.net.ApiClient;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Rectangle;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.Map;

public class LoginView {
    private final ApiClient api;
    private final Gson gson = new Gson();

    public interface LoginSuccessHandler { void onSuccess(); }

    public LoginView(ApiClient api) { this.api = api; }

    public Node getView(LoginSuccessHandler handler) {
        BorderPane root = new BorderPane();
        root.setStyle("-fx-background-color: linear-gradient(to bottom right, #eff6ff 0%, #dbeafe 30%, #ffffff 100%);");

        // Left side - Hero section
        VBox leftSide = createHeroSection();
        
        // Right side - Auth forms
        VBox rightSide = new VBox(0);
        rightSide.setAlignment(Pos.TOP_CENTER);
        rightSide.setStyle("-fx-background-color: #ffffff; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.06), 30, 0, -8, 0);");
        rightSide.setMinWidth(540);
        rightSide.setMaxWidth(540);

        TabPane tabPane = new TabPane();
        tabPane.setTabClosingPolicy(TabPane.TabClosingPolicy.UNAVAILABLE);
        tabPane.setStyle("-fx-background-color: white; -fx-border-width: 0; -fx-padding: 0;");
        tabPane.setPadding(new Insets(0));

        // Login Tab
        Tab loginTab = new Tab("Login");
        loginTab.setContent(createLoginForm(handler));

        // Register Tab
        Tab registerTab = new Tab("Register");
        registerTab.setContent(createRegisterForm(handler));

        tabPane.getTabs().addAll(loginTab, registerTab);

        rightSide.getChildren().addAll(tabPane);

        root.setLeft(leftSide);
        root.setRight(rightSide);
        
        return root;
    }

    private VBox createHeroSection() {
        VBox hero = new VBox(50);
        hero.setPadding(new Insets(70, 70, 70, 70));
        hero.setAlignment(Pos.CENTER);
        hero.setMinWidth(620);
        hero.setStyle("-fx-background-color: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);");
        HBox.setHgrow(hero, Priority.ALWAYS);

        // Logo/Icon area with modern design
        StackPane iconArea = new StackPane();
        Circle outerGlow = new Circle(75);
        outerGlow.setFill(Color.rgb(255, 255, 255, 0.15));
        
        Circle innerCircle = new Circle(55);
        innerCircle.setFill(Color.rgb(255, 255, 255, 0.98));
        innerCircle.setEffect(new javafx.scene.effect.DropShadow(15, Color.rgb(0, 0, 0, 0.1)));
        
        Label icon = new Label("💊");
        icon.setStyle("-fx-font-size: 48px;");
        
        iconArea.getChildren().addAll(outerGlow, innerCircle, icon);

        // Title
        Label title = new Label("MediMate");
        title.setStyle("-fx-font-size: 56px; -fx-font-weight: 800; -fx-text-fill: #0f172a; -fx-font-family: 'Segoe UI', 'Arial', sans-serif; letter-spacing: -1px; -fx-effect: dropshadow(gaussian, rgba(255,255,255,0.3), 3, 0, 0, 2);");

        // Subtitle
        Label subtitle = new Label("Your Personal Health Companion");
        subtitle.setStyle("-fx-font-size: 20px; -fx-text-fill: #1e293b; -fx-font-weight: 500; -fx-effect: dropshadow(gaussian, rgba(255,255,255,0.2), 2, 0, 0, 1);");
        subtitle.setWrapText(true);
        subtitle.setAlignment(Pos.CENTER);

        // Features
        VBox features = new VBox(18);
        features.setAlignment(Pos.CENTER);
        features.setMaxWidth(480);
        features.setPadding(new Insets(30, 0, 0, 0));
        
        features.getChildren().addAll(
            createFeatureItem("💊", "Track Medications", "Never miss a dose with smart reminders"),
            createFeatureItem("📊", "Wellness Logs", "Monitor your health and mood daily"),
            createFeatureItem("🔒", "Secure & Private", "Your health data stays protected")
        );

        hero.getChildren().addAll(iconArea, title, subtitle, features);
        return hero;
    }

    private HBox createFeatureItem(String emoji, String title, String description) {
        HBox item = new HBox(20);
        item.setAlignment(Pos.CENTER_LEFT);
        item.setPadding(new Insets(20, 24, 20, 24));
        // Glassmorphism effect
        item.setStyle("-fx-background-color: rgba(255, 255, 255, 0.15); -fx-background-radius: 16; -fx-border-color: rgba(255, 255, 255, 0.25); -fx-border-width: 1; -fx-border-radius: 16; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.15), 12, 0, 0, 4);");

        // Icon with glow
        StackPane iconBg = new StackPane();
        Circle bg = new Circle(26);
        bg.setFill(Color.rgb(255, 255, 255, 0.35));
        bg.setEffect(new javafx.scene.effect.DropShadow(8, Color.rgb(255, 255, 255, 0.4)));
        Label emojiLabel = new Label(emoji);
        emojiLabel.setStyle("-fx-font-size: 30px;");
        iconBg.getChildren().addAll(bg, emojiLabel);

        VBox textBox = new VBox(7);
        Label titleLabel = new Label(title);
        titleLabel.setStyle("-fx-font-size: 17px; -fx-font-weight: 700; -fx-text-fill: #0f172a; -fx-effect: dropshadow(gaussian, rgba(255,255,255,0.3), 2, 0, 0, 1);");
        Label descLabel = new Label(description);
        descLabel.setStyle("-fx-font-size: 14px; -fx-text-fill: #1e293b; -fx-font-weight: 400; -fx-effect: dropshadow(gaussian, rgba(255,255,255,0.2), 1, 0, 0, 1);");
        descLabel.setWrapText(true);
        textBox.getChildren().addAll(titleLabel, descLabel);
        HBox.setHgrow(textBox, Priority.ALWAYS);

        item.getChildren().addAll(iconBg, textBox);
        return item;
    }

    private Node createLoginForm(LoginSuccessHandler handler) {
        VBox form = new VBox(20);
        form.setPadding(new Insets(50, 50, 50, 50));

        Label welcomeLabel = new Label("Welcome Back");
        welcomeLabel.setStyle("-fx-font-size: 34px; -fx-font-weight: 700; -fx-text-fill: #0f172a; -fx-font-family: 'Segoe UI', sans-serif;");
        
        Label subtitleLabel = new Label("Sign in to continue to MediMate");
        subtitleLabel.setStyle("-fx-font-size: 15px; -fx-text-fill: #64748b; -fx-font-weight: 400;");
        
        VBox header = new VBox(8);
        header.getChildren().addAll(welcomeLabel, subtitleLabel);
        header.setPadding(new Insets(0, 0, 10, 0));

        String inputStyle = "-fx-font-size: 15px; -fx-background-color: #f9fafb; -fx-border-color: #d1d5db; -fx-border-width: 1.5; -fx-border-radius: 12; -fx-background-radius: 12; -fx-padding: 14 18; -fx-font-family: 'Segoe UI', sans-serif;";
        String inputFocusStyle = "-fx-font-size: 15px; -fx-background-color: #ffffff; -fx-border-color: #3b82f6; -fx-border-width: 2; -fx-border-radius: 12; -fx-background-radius: 12; -fx-padding: 14 18; -fx-font-family: 'Segoe UI', sans-serif;";
        
        TextField username = new TextField();
        username.setPromptText("Username or Email");
        username.setPrefHeight(54);
        username.setStyle(inputStyle);
        username.focusedProperty().addListener((obs, wasFocused, isNowFocused) -> {
            username.setStyle(isNowFocused ? inputFocusStyle : inputStyle);
        });

        PasswordField password = new PasswordField();
        password.setPromptText("Password");
        password.setPrefHeight(54);
        password.setStyle(inputStyle);
        password.focusedProperty().addListener((obs, wasFocused, isNowFocused) -> {
            password.setStyle(isNowFocused ? inputFocusStyle : inputStyle);
        });

        Button loginBtn = new Button("Sign In");
        loginBtn.setPrefHeight(54);
        loginBtn.setMaxWidth(Double.MAX_VALUE);
        loginBtn.setStyle("-fx-background-color: linear-gradient(to right, #3b82f6, #2563eb); -fx-text-fill: white; -fx-font-size: 16px; -fx-font-weight: 600; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(59,130,246,0.35), 16, 0, 0, 6); -fx-font-family: 'Segoe UI', sans-serif;");
        loginBtn.setOnMouseEntered(e -> loginBtn.setStyle("-fx-background-color: linear-gradient(to right, #2563eb, #1d4ed8); -fx-text-fill: white; -fx-font-size: 16px; -fx-font-weight: 600; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(59,130,246,0.5), 20, 0, 0, 8); -fx-font-family: 'Segoe UI', sans-serif;"));
        loginBtn.setOnMouseExited(e -> loginBtn.setStyle("-fx-background-color: linear-gradient(to right, #3b82f6, #2563eb); -fx-text-fill: white; -fx-font-size: 16px; -fx-font-weight: 600; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(59,130,246,0.35), 16, 0, 0, 6); -fx-font-family: 'Segoe UI', sans-serif;"));

        Label status = new Label();
        status.getStyleClass().add("status");
        status.setWrapText(true);

        loginBtn.setOnAction(e -> {
            String user = username.getText().trim();
            String pass = password.getText();
            
            if (user.isEmpty() || pass.isEmpty()) {
                status.setText("Please fill in all fields");
                return;
            }

            try {
                Map<String, String> payload = Map.of(
                        "username", user,
                        "password", pass
                );
                String resp = api.postJson("/api/auth/login", payload);
                Type t = new TypeToken<Map<String, String>>(){}.getType();
                Map<String, String> map = gson.fromJson(resp, t);
                api.setToken(map.get("token"));
                status.setStyle("-fx-text-fill: #10b981;");
                status.setText("✓ Login successful!");
                handler.onSuccess();
            } catch (Exception ex) {
                status.setStyle("-fx-text-fill: #ef4444;");
                status.setText("✗ Login failed: " + ex.getMessage());
            }
        });

        // Google Sign-In Button
        Button googleBtn = new Button();
        googleBtn.setPrefHeight(54);
        googleBtn.setMaxWidth(Double.MAX_VALUE);
        googleBtn.setStyle("-fx-background-color: #ffffff; -fx-border-color: #d1d5db; -fx-border-width: 1.5; -fx-border-radius: 12; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.04), 8, 0, 0, 2);");
        
        Label googleIcon = new Label("🔍");
        googleIcon.setStyle("-fx-font-size: 24px;");
        
        HBox googleBtnContent = new HBox(12);
        googleBtnContent.setAlignment(Pos.CENTER);
        Label googleText = new Label("Continue with Google");
        googleText.setStyle("-fx-text-fill: #374151; -fx-font-size: 15px; -fx-font-weight: 600; -fx-font-family: 'Segoe UI', sans-serif;");
        googleBtnContent.getChildren().addAll(googleIcon, googleText);
        
        googleBtn.setGraphic(googleBtnContent);
        googleBtn.setText("");
        
        googleBtn.setOnMouseEntered(e -> googleBtn.setStyle("-fx-background-color: #f9fafb; -fx-border-color: #9ca3af; -fx-border-width: 1.5; -fx-border-radius: 12; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.08), 12, 0, 0, 4);"));
        googleBtn.setOnMouseExited(e -> googleBtn.setStyle("-fx-background-color: #ffffff; -fx-border-color: #d1d5db; -fx-border-width: 1.5; -fx-border-radius: 12; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.04), 8, 0, 0, 2);"));
        
        googleBtn.setOnAction(e -> {
            try {
                // Open Google OAuth in browser
                String authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                    "client_id=104342760903-57g6sbvtievmfd3mrv3uhp1pbhiicfrk.apps.googleusercontent.com" +
                    "&redirect_uri=http://localhost:8888" +
                    "&response_type=id_token" +
                    "&scope=openid%20email%20profile" +
                    "&nonce=" + System.currentTimeMillis();
                
                java.awt.Desktop.getDesktop().browse(new java.net.URI(authUrl));
                
                // Show input dialog for URL
                TextInputDialog dialog = new TextInputDialog();
                dialog.setTitle("Google Sign-In");
                dialog.setHeaderText("Complete authentication in your browser");
                dialog.setContentText("After authorizing, paste the redirect URL here:");
                
                dialog.showAndWait().ifPresent(url -> {
                    // Extract ID token from URL fragment
                    if (url.contains("id_token=")) {
                        String idToken = url.split("id_token=")[1].split("&")[0];
                        
                        // Verify with backend
                        try {
                            Map<String, String> requestBody = new HashMap<>();
                            requestBody.put("idToken", idToken);
                            String response = api.postJson("/api/auth/google/verify", requestBody);
                            
                            // Parse response
                            Type t = new TypeToken<Map<String, Object>>(){}.getType();
                            Map<String, Object> result = gson.fromJson(response, t);
                            
                            String token = (String) result.get("token");
                            api.setToken(token);
                            
                            status.setStyle("-fx-text-fill: #10b981;");
                            status.setText("✓ Google Sign-In successful!");
                            
                            // Navigate to dashboard
                            onLogin.run();
                            
                        } catch (Exception ex) {
                            status.setStyle("-fx-text-fill: #ef4444;");
                            status.setText("✗ Google Sign-In failed: " + ex.getMessage());
                        }
                    } else {
                        status.setStyle("-fx-text-fill: #ef4444;");
                        status.setText("✗ Invalid URL. Please try again.");
                    }
                });
                
            } catch (Exception ex) {
                status.setStyle("-fx-text-fill: #ef4444;");
                status.setText("✗ Error: " + ex.getMessage());
            }
        });

        form.getChildren().addAll(header, username, password, loginBtn, googleBtn, status);
        return form;
    }

    private Node createRegisterForm(LoginSuccessHandler handler) {
        VBox form = new VBox(18);
        form.setPadding(new Insets(50, 50, 50, 50));

        Label welcomeLabel = new Label("Create Account");
        welcomeLabel.setStyle("-fx-font-size: 34px; -fx-font-weight: 700; -fx-text-fill: #0f172a; -fx-font-family: 'Segoe UI', sans-serif;");
        
        Label subtitleLabel = new Label("Join MediMate to start your health journey");
        subtitleLabel.setStyle("-fx-font-size: 15px; -fx-text-fill: #64748b; -fx-font-weight: 400;");
        
        VBox header = new VBox(8);
        header.getChildren().addAll(welcomeLabel, subtitleLabel);
        header.setPadding(new Insets(0, 0, 10, 0));

        String inputStyle = "-fx-font-size: 15px; -fx-background-color: #f9fafb; -fx-border-color: #d1d5db; -fx-border-width: 1.5; -fx-border-radius: 12; -fx-background-radius: 12; -fx-padding: 14 18; -fx-font-family: 'Segoe UI', sans-serif;";
        String inputFocusStyle = "-fx-font-size: 15px; -fx-background-color: #ffffff; -fx-border-color: #3b82f6; -fx-border-width: 2; -fx-border-radius: 12; -fx-background-radius: 12; -fx-padding: 14 18; -fx-font-family: 'Segoe UI', sans-serif;";
        
        TextField fullName = new TextField();
        fullName.setPromptText("Full Name");
        fullName.setPrefHeight(54);
        fullName.setStyle(inputStyle);
        fullName.focusedProperty().addListener((obs, wasFocused, isNowFocused) -> {
            fullName.setStyle(isNowFocused ? inputFocusStyle : inputStyle);
        });

        TextField email = new TextField();
        email.setPromptText("Email Address");
        email.setPrefHeight(54);
        email.setStyle(inputStyle);
        email.focusedProperty().addListener((obs, wasFocused, isNowFocused) -> {
            email.setStyle(isNowFocused ? inputFocusStyle : inputStyle);
        });

        TextField username = new TextField();
        username.setPromptText("Username");
        username.setPrefHeight(54);
        username.setStyle(inputStyle);
        username.focusedProperty().addListener((obs, wasFocused, isNowFocused) -> {
            username.setStyle(isNowFocused ? inputFocusStyle : inputStyle);
        });

        PasswordField password = new PasswordField();
        password.setPromptText("Password");
        password.setPrefHeight(54);
        password.setStyle(inputStyle);
        password.focusedProperty().addListener((obs, wasFocused, isNowFocused) -> {
            password.setStyle(isNowFocused ? inputFocusStyle : inputStyle);
        });

        PasswordField confirmPassword = new PasswordField();
        confirmPassword.setPromptText("Confirm Password");
        confirmPassword.setPrefHeight(54);
        confirmPassword.setStyle(inputStyle);
        confirmPassword.focusedProperty().addListener((obs, wasFocused, isNowFocused) -> {
            confirmPassword.setStyle(isNowFocused ? inputFocusStyle : inputStyle);
        });

        ComboBox<String> roleBox = new ComboBox<>();
        roleBox.getItems().addAll("Elderly User", "Caregiver");
        roleBox.setValue("Elderly User");
        roleBox.setPrefHeight(54);
        roleBox.setMaxWidth(Double.MAX_VALUE);
        roleBox.setStyle(inputStyle);

        Button registerBtn = new Button("Create Account");
        registerBtn.setPrefHeight(54);
        registerBtn.setMaxWidth(Double.MAX_VALUE);
        registerBtn.setStyle("-fx-background-color: linear-gradient(to right, #3b82f6, #2563eb); -fx-text-fill: white; -fx-font-size: 16px; -fx-font-weight: 600; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(59,130,246,0.35), 16, 0, 0, 6); -fx-font-family: 'Segoe UI', sans-serif;");
        registerBtn.setOnMouseEntered(e -> registerBtn.setStyle("-fx-background-color: linear-gradient(to right, #2563eb, #1d4ed8); -fx-text-fill: white; -fx-font-size: 16px; -fx-font-weight: 600; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(59,130,246,0.5), 20, 0, 0, 8); -fx-font-family: 'Segoe UI', sans-serif;"));
        registerBtn.setOnMouseExited(e -> registerBtn.setStyle("-fx-background-color: linear-gradient(to right, #3b82f6, #2563eb); -fx-text-fill: white; -fx-font-size: 16px; -fx-font-weight: 600; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(59,130,246,0.35), 16, 0, 0, 6); -fx-font-family: 'Segoe UI', sans-serif;"));

        Label status = new Label();
        status.getStyleClass().add("status");
        status.setWrapText(true);

        registerBtn.setOnAction(e -> {
            String name = fullName.getText().trim();
            String emailText = email.getText().trim();
            String user = username.getText().trim();
            String pass = password.getText();
            String confirmPass = confirmPassword.getText();
            
            if (name.isEmpty() || emailText.isEmpty() || user.isEmpty() || pass.isEmpty()) {
                status.setStyle("-fx-text-fill: #ef4444;");
                status.setText("✗ Please fill in all fields");
                return;
            }
            
            if (!pass.equals(confirmPass)) {
                status.setStyle("-fx-text-fill: #ef4444;");
                status.setText("✗ Passwords do not match");
                return;
            }
            
            if (pass.length() < 6) {
                status.setStyle("-fx-text-fill: #ef4444;");
                status.setText("✗ Password must be at least 6 characters");
                return;
            }

            try {
                Map<String, String> payload = new HashMap<>();
                payload.put("username", user);
                payload.put("password", pass);
                payload.put("fullName", name);
                payload.put("email", emailText);
                payload.put("role", roleBox.getValue().equals("Elderly User") ? "ELDERLY" : "CAREGIVER");
                api.postJson("/api/auth/register", payload);
                status.setStyle("-fx-text-fill: #10b981;");
                status.setText("✓ Registration successful! Please switch to Login tab.");
                
                // Clear form
                fullName.clear();
                email.clear();
                username.clear();
                password.clear();
                confirmPassword.clear();
            } catch (Exception ex) {
                status.setStyle("-fx-text-fill: #ef4444;");
                status.setText("✗ Registration failed: " + ex.getMessage());
            }
        });

        // Google Sign-Up Button
        Button googleBtn = new Button();
        googleBtn.setPrefHeight(54);
        googleBtn.setMaxWidth(Double.MAX_VALUE);
        googleBtn.setStyle("-fx-background-color: #ffffff; -fx-border-color: #d1d5db; -fx-border-width: 1.5; -fx-border-radius: 12; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.04), 8, 0, 0, 2);");
        
        Label googleIcon = new Label("🔍");
        googleIcon.setStyle("-fx-font-size: 24px;");
        
        HBox googleBtnContent = new HBox(12);
        googleBtnContent.setAlignment(Pos.CENTER);
        Label googleText = new Label("Continue with Google");
        googleText.setStyle("-fx-text-fill: #374151; -fx-font-size: 15px; -fx-font-weight: 600; -fx-font-family: 'Segoe UI', sans-serif;");
        googleBtnContent.getChildren().addAll(googleIcon, googleText);
        
        googleBtn.setGraphic(googleBtnContent);
        googleBtn.setText("");
        
        googleBtn.setOnMouseEntered(e -> googleBtn.setStyle("-fx-background-color: #f9fafb; -fx-border-color: #9ca3af; -fx-border-width: 1.5; -fx-border-radius: 12; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.08), 12, 0, 0, 4);"));
        googleBtn.setOnMouseExited(e -> googleBtn.setStyle("-fx-background-color: #ffffff; -fx-border-color: #d1d5db; -fx-border-width: 1.5; -fx-border-radius: 12; -fx-background-radius: 12; -fx-cursor: hand; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.04), 8, 0, 0, 2);"));
        
        googleBtn.setOnAction(e -> {
            try {
                // Open Google OAuth in browser
                String authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                    "client_id=104342760903-57g6sbvtievmfd3mrv3uhp1pbhiicfrk.apps.googleusercontent.com" +
                    "&redirect_uri=http://localhost:8888" +
                    "&response_type=id_token" +
                    "&scope=openid%20email%20profile" +
                    "&nonce=" + System.currentTimeMillis();
                
                java.awt.Desktop.getDesktop().browse(new java.net.URI(authUrl));
                
                // Show input dialog for URL
                TextInputDialog dialog = new TextInputDialog();
                dialog.setTitle("Google Sign-Up");
                dialog.setHeaderText("Complete authentication in your browser");
                dialog.setContentText("After authorizing, paste the redirect URL here:");
                
                dialog.showAndWait().ifPresent(url -> {
                    // Extract ID token from URL fragment
                    if (url.contains("id_token=")) {
                        String idToken = url.split("id_token=")[1].split("&")[0];
                        
                        // Verify with backend
                        try {
                            Map<String, String> requestBody = new HashMap<>();
                            requestBody.put("idToken", idToken);
                            String response = api.postJson("/api/auth/google/verify", requestBody);
                            
                            // Parse response
                            Type t = new TypeToken<Map<String, Object>>(){}.getType();
                            Map<String, Object> result = gson.fromJson(response, t);
                            
                            String token = (String) result.get("token");
                            api.setToken(token);
                            
                            status.setStyle("-fx-text-fill: #10b981;");
                            status.setText("✓ Google Sign-Up successful!");
                            
                            // Navigate to dashboard
                            handler.onLoginSuccess();
                            
                        } catch (Exception ex) {
                            status.setStyle("-fx-text-fill: #ef4444;");
                            status.setText("✗ Google Sign-Up failed: " + ex.getMessage());
                        }
                    } else {
                        status.setStyle("-fx-text-fill: #ef4444;");
                        status.setText("✗ Invalid URL. Please try again.");
                    }
                });
                
            } catch (Exception ex) {
                status.setStyle("-fx-text-fill: #ef4444;");
                status.setText("✗ Error: " + ex.getMessage());
            }
        });

        form.getChildren().addAll(header, fullName, email, username, password, confirmPassword, roleBox, registerBtn, googleBtn, status);
        return form;
    }
}
