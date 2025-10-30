package com.medimate.app.ui;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.medimate.app.model.Medication;
import com.medimate.app.model.WellnessLog;
import com.medimate.app.net.ApiClient;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.chart.*;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class DashboardView {
    private final ApiClient api;
    private final ThemeManager theme;
    private final Runnable onLogout;
    private final Gson gson = new Gson();

    public DashboardView(ApiClient api, ThemeManager theme, Runnable onLogout) {
        this.api = api; this.theme = theme; this.onLogout = onLogout;
    }

    private String currentView = "dashboard";
    private BorderPane mainRoot;
    private VBox centerContent;
    private boolean isDarkMode = false;

    public Node getView() {
        mainRoot = new BorderPane();
        mainRoot.getStyleClass().add("root");
        updateColors();

        // Top Navigation Bar
        mainRoot.setTop(createTopBar());

        // Left Sidebar
        mainRoot.setLeft(createSidebar());

        // Center Content Area
        centerContent = new VBox();
        centerContent.setId("centerContent");
        loadDashboardView();
        mainRoot.setCenter(centerContent);

        // Right Notifications Panel
        loadNotificationsPanel();

        return mainRoot;
    }
    
    private void updateColors() {
        if (isDarkMode) {
            mainRoot.setStyle("-fx-background-color: #0f172a;");
        } else {
            mainRoot.setStyle("-fx-background-color: linear-gradient(to bottom right, #fef3c7, #fce7f3, #dbeafe);");
        }
    }

    private HBox createTopBar() {
        HBox topBar = new HBox(20);
        topBar.setPadding(new Insets(16, 24, 16, 24));
        topBar.setAlignment(Pos.CENTER_LEFT);
        topBar.setStyle("-fx-background-color: #ffffff; -fx-border-color: #e2e8f0; -fx-border-width: 0 0 1 0; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.04), 8, 0, 0, 2);");

        // Logo
        Label logo = new Label("💊 MediMate");
        logo.setStyle("-fx-font-size: 22px; -fx-font-weight: 700; -fx-text-fill: #3b82f6;");

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        // Search Bar
        TextField search = new TextField();
        search.setPromptText("🔍 Search...");
        search.setPrefWidth(300);
        search.setStyle("-fx-background-color: #f1f5f9; -fx-border-color: transparent; -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 8 16;");

        // Theme Toggle
        Button themeBtn = new Button(isDarkMode ? "☀️" : "🌙");
        themeBtn.setStyle("-fx-background-color: #f1f5f9; -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 8 12; -fx-cursor: hand;");
        themeBtn.setOnAction(e -> {
            isDarkMode = !isDarkMode;
            theme.toggle();
            refreshDashboard();
        });

        // User Avatar
        Circle avatar = new Circle(18);
        avatar.setFill(Color.web("#3b82f6"));
        StackPane avatarStack = new StackPane();
        Label avatarText = new Label("U");
        avatarText.setStyle("-fx-text-fill: white; -fx-font-weight: 700;");
        avatarStack.getChildren().addAll(avatar, avatarText);

        // Settings
        Button settingsBtn = new Button("⚙️");
        settingsBtn.setStyle("-fx-background-color: transparent; -fx-cursor: hand; -fx-font-size: 18px;");

        // Logout
        Button logoutBtn = new Button("Logout");
        logoutBtn.setStyle("-fx-background-color: #fee2e2; -fx-text-fill: #dc2626; -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 8 16; -fx-cursor: hand; -fx-font-weight: 600;");
        logoutBtn.setOnAction(e -> onLogout.run());

        topBar.getChildren().addAll(logo, spacer, search, themeBtn, settingsBtn, avatarStack, logoutBtn);
        return topBar;
    }

    private VBox createSidebar() {
        VBox sidebar = new VBox(8);
        sidebar.setPadding(new Insets(24, 16, 24, 16));
        sidebar.setPrefWidth(240);
        sidebar.setStyle("-fx-background-color: #ffffff; -fx-border-color: #e2e8f0; -fx-border-width: 0 1 0 0;");

        sidebar.getChildren().addAll(
            createSidebarButton("📊 Dashboard", "dashboard"),
            createSidebarButton("💊 Medications", "medications"),
            createSidebarButton("🩺 Wellness Logs", "wellness"),
            createSidebarButton("📈 Analytics", "analytics"),
            createSidebarButton("🤖 AI Insights", "insights"),
            createSidebarButton("⚙️ Settings", "settings")
        );

        return sidebar;
    }

    private Button createSidebarButton(String text, String viewId) {
        Button btn = new Button(text);
        btn.setMaxWidth(Double.MAX_VALUE);
        btn.setAlignment(Pos.CENTER_LEFT);
        String activeStyle = "-fx-background-color: #eff6ff; -fx-text-fill: #3b82f6; -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 12 16; -fx-cursor: hand; -fx-font-size: 14px; -fx-font-weight: 600;";
        String inactiveStyle = "-fx-background-color: transparent; -fx-text-fill: #64748b; -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 12 16; -fx-cursor: hand; -fx-font-size: 14px; -fx-font-weight: 500;";
        
        btn.setStyle(currentView.equals(viewId) ? activeStyle : inactiveStyle);
        btn.setOnAction(e -> switchView(viewId));
        
        return btn;
    }

    private void refreshDashboard() {
        mainRoot.setTop(createTopBar());
        mainRoot.setLeft(createSidebar());
        mainRoot.setRight(createNotificationsPanel());
        switchView(currentView);
    }
    
    private void switchView(String viewId) {
        currentView = viewId;
        
        // Update center content based on view
        centerContent.getChildren().clear();
        
        switch (viewId) {
            case "dashboard":
                loadDashboardView();
                break;
            case "medications":
                centerContent.getChildren().add(medicationsTab());
                break;
            case "wellness":
                centerContent.getChildren().add(wellnessTab());
                break;
            case "analytics":
                centerContent.getChildren().add(createAnalyticsView());
                break;
            case "insights":
                centerContent.getChildren().add(createInsightsView());
                break;
            case "settings":
                centerContent.getChildren().add(createSettingsView());
                break;
        }
        
        // Refresh sidebar
        mainRoot.setLeft(createSidebar());
    }
    
    private void loadDashboardView() {
        centerContent.getChildren().clear();
        centerContent.getChildren().add(createDashboardView());
    }
    
    private void loadNotificationsPanel() {
        mainRoot.setRight(createNotificationsPanel());
    }

    private ScrollPane createDashboardView() {
        VBox content = new VBox(20);
        content.setPadding(new Insets(24));

        // Welcome Card
        VBox welcomeCard = createCard();
        Label welcome = new Label("Welcome back! 👋");
        welcome.setStyle("-fx-font-size: 24px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        Label subtitle = new Label("Here's your health summary for today");
        subtitle.setStyle("-fx-font-size: 14px; -fx-text-fill: #64748b;");
        welcomeCard.getChildren().addAll(welcome, subtitle);

        // Stats Cards Row - Load from API
        HBox statsRow = new HBox(16);
        loadStatsCards(statsRow);

        // Charts Row
        HBox chartsRow = new HBox(16);
        loadMoodChart(chartsRow);
        loadUpcomingMeds(chartsRow);

        // AI Insights Card - Load from API
        VBox aiCard = createCard();
        aiCard.setStyle(aiCard.getStyle() + "-fx-background-color: #dbeafe;");
        loadAIInsights(aiCard);

        content.getChildren().addAll(welcomeCard, statsRow, chartsRow, aiCard);
        
        ScrollPane scroll = new ScrollPane(content);
        scroll.setFitToWidth(true);
        scroll.setStyle("-fx-background: #f8fafc; -fx-background-color: #f8fafc;");
        return scroll;
    }

    private VBox createCard() {
        VBox card = new VBox(12);
        card.setPadding(new Insets(20));
        if (isDarkMode) {
            card.setStyle("-fx-background-color: #1e293b; -fx-border-radius: 12; -fx-background-radius: 12; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.4), 12, 0, 0, 4);");
        } else {
            card.setStyle("-fx-background-color: rgba(255,255,255,0.9); -fx-border-radius: 12; -fx-background-radius: 12; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.06), 12, 0, 0, 4);");
        }
        return card;
    }

    private VBox createStatCard(String icon, String value, String subtitle, String color) {
        VBox card = createCard();
        card.setPrefWidth(200);
        card.setAlignment(Pos.CENTER_LEFT);
        
        // Add gradient background based on color
        String gradient = "";
        switch (color) {
            case "#10b981": gradient = "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)"; break;
            case "#3b82f6": gradient = "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)"; break;
            case "#f59e0b": gradient = "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"; break;
            case "#8b5cf6": gradient = "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)"; break;
            default: gradient = "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)";
        }
        card.setStyle(card.getStyle() + "-fx-background-color: " + gradient + ";");
        
        Label iconLabel = new Label(icon);
        iconLabel.setStyle("-fx-font-size: 32px;");
        
        Label valueLabel = new Label(value);
        valueLabel.setStyle("-fx-font-size: 24px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        
        Label subtitleLabel = new Label(subtitle);
        subtitleLabel.setStyle("-fx-font-size: 12px; -fx-text-fill: #475569;");
        
        card.getChildren().addAll(iconLabel, valueLabel, subtitleLabel);
        return card;
    }

    private void loadStatsCards(HBox statsRow) {
        try {
            String resp = api.get("/api/dashboard/stats");
            Type t = new TypeToken<Map<String, Object>>(){}.getType();
            Map<String, Object> stats = gson.fromJson(resp, t);
            
            int streak = ((Double) stats.getOrDefault("streak", 0.0)).intValue();
            int medsToday = ((Double) stats.getOrDefault("medicationsToday", 0.0)).intValue();
            int medsCompleted = ((Double) stats.getOrDefault("medicationsCompleted", 0.0)).intValue();
            String mood = (String) stats.getOrDefault("mood", "Good");
            int energy = ((Double) stats.getOrDefault("energy", 7.0)).intValue();
            
            statsRow.getChildren().addAll(
                createStatCard("🎯 Streak", streak + " Days", "Keep it up!", "#10b981"),
                createStatCard("💊 Medications", medsToday + " Today", medsCompleted + " completed", "#3b82f6"),
                createStatCard("😊 Mood", mood, "Feeling " + mood.toLowerCase(), "#f59e0b"),
                createStatCard("⚡ Energy", energy + "/10", "Energy level", "#8b5cf6")
            );
        } catch (Exception e) {
            statsRow.getChildren().addAll(
                createStatCard("🎯 Streak", "0 Days", "Start logging!", "#10b981"),
                createStatCard("💊 Medications", "0 Today", "Add medications", "#3b82f6"),
                createStatCard("😊 Mood", "--", "Log your mood", "#f59e0b"),
                createStatCard("⚡ Energy", "--", "Track energy", "#8b5cf6")
            );
        }
    }
    
    private void loadMoodChart(HBox chartsRow) {
        VBox chartCard = createMoodChart();
        chartsRow.getChildren().add(chartCard);
    }
    
    private void loadUpcomingMeds(HBox chartsRow) {
        VBox medsCard = createUpcomingMeds();
        chartsRow.getChildren().add(medsCard);
    }
    
    private void loadAIInsights(VBox aiCard) {
        Label aiTitle = new Label("🤖 AI Wellness Insights");
        aiTitle.setStyle("-fx-font-size: 18px; -fx-font-weight: 700; -fx-text-fill: #1e40af;");
        
        Label aiInsight = new Label("Loading insights...");
        aiInsight.setWrapText(true);
        aiInsight.setStyle("-fx-font-size: 14px; -fx-text-fill: #1e40af; -fx-padding: 12 0 0 0;");
        
        aiCard.getChildren().addAll(aiTitle, aiInsight);
        
        // Load from API
        new Thread(() -> {
            try {
                String resp = api.get("/api/dashboard/ai-insights");
                Type t = new TypeToken<Map<String, String>>(){}.getType();
                Map<String, String> insights = gson.fromJson(resp, t);
                String insight = insights.getOrDefault("insight", "Start logging to get insights!");
                
                javafx.application.Platform.runLater(() -> {
                    aiInsight.setText(insight);
                });
            } catch (Exception e) {
                javafx.application.Platform.runLater(() -> {
                    aiInsight.setText("Start logging your wellness data to receive personalized AI insights!");
                });
            }
        }).start();
    }

    private VBox createMoodChart() {
        VBox card = createCard();
        card.setPrefWidth(400);
        HBox.setHgrow(card, Priority.ALWAYS);
        
        Label title = new Label("📊 Mood Trends (7 Days)");
        title.setStyle("-fx-font-size: 16px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        
        // Load real data from API
        try {
            String resp = api.get("/api/dashboard/mood-trends");
            Type t = new TypeToken<Map<String, Double>>(){}.getType();
            Map<String, Double> trends = gson.fromJson(resp, t);
            
            boolean hasData = trends.values().stream().anyMatch(v -> v != 5.0);
            
            if (!hasData) {
                // Show empty state with colorful design
                VBox emptyState = new VBox(12);
                emptyState.setAlignment(Pos.CENTER);
                emptyState.setPadding(new Insets(40, 20, 40, 20));
                emptyState.setStyle("-fx-background-color: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -fx-background-radius: 12;");
                
                Label emptyIcon = new Label("📈");
                emptyIcon.setStyle("-fx-font-size: 48px;");
                
                Label emptyLabel = new Label("Start logging your wellness\nto see mood trends!");
                emptyLabel.setStyle("-fx-text-fill: white; -fx-font-size: 14px; -fx-text-alignment: center;");
                emptyLabel.setWrapText(true);
                
                emptyState.getChildren().addAll(emptyIcon, emptyLabel);
                card.getChildren().addAll(title, emptyState);
            } else {
                // Create chart with real data
                CategoryAxis xAxis = new CategoryAxis();
                NumberAxis yAxis = new NumberAxis(0, 10, 1);
                LineChart<String, Number> chart = new LineChart<>(xAxis, yAxis);
                chart.setTitle("");
                chart.setLegendVisible(false);
                chart.setPrefHeight(200);
                
                XYChart.Series<String, Number> series = new XYChart.Series<>();
                for (Map.Entry<String, Double> entry : trends.entrySet()) {
                    series.getData().add(new XYChart.Data<>(entry.getKey(), entry.getValue()));
                }
                chart.getData().add(series);
                card.getChildren().addAll(title, chart);
            }
        } catch (Exception e) {
            VBox emptyState = new VBox(12);
            emptyState.setAlignment(Pos.CENTER);
            emptyState.setPadding(new Insets(40, 20, 40, 20));
            emptyState.setStyle("-fx-background-color: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -fx-background-radius: 12;");
            
            Label emptyIcon = new Label("📈");
            emptyIcon.setStyle("-fx-font-size: 48px;");
            
            Label emptyLabel = new Label("Start logging your wellness\nto see mood trends!");
            emptyLabel.setStyle("-fx-text-fill: white; -fx-font-size: 14px; -fx-text-alignment: center;");
            emptyLabel.setWrapText(true);
            
            emptyState.getChildren().addAll(emptyIcon, emptyLabel);
            card.getChildren().addAll(title, emptyState);
        }
        
        return card;
    }

    private VBox createUpcomingMeds() {
        VBox card = createCard();
        card.setPrefWidth(300);
        
        Label title = new Label("💊 Upcoming Medications");
        title.setStyle("-fx-font-size: 16px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        
        VBox medsList = new VBox(12);
        
        // Load from API
        try {
            String resp = api.get("/api/dashboard/upcoming-medications");
            Type t = new TypeToken<List<Map<String, String>>>(){}.getType();
            List<Map<String, String>> meds = gson.fromJson(resp, t);
            
            if (meds.isEmpty()) {
                Label noMeds = new Label("No medications scheduled");
                noMeds.setStyle("-fx-text-fill: #64748b; -fx-font-size: 13px;");
                medsList.getChildren().add(noMeds);
            } else {
                for (Map<String, String> med : meds) {
                    medsList.getChildren().add(
                        createMedItem(
                            med.getOrDefault("name", "Medication"),
                            med.getOrDefault("time", "--:--"),
                            med.getOrDefault("countdown", "Scheduled")
                        )
                    );
                }
            }
        } catch (Exception e) {
            Label error = new Label("Add medications to see them here");
            error.setStyle("-fx-text-fill: #64748b; -fx-font-size: 13px;");
            medsList.getChildren().add(error);
        }
        
        card.getChildren().addAll(title, medsList);
        return card;
    }

    private HBox createMedItem(String name, String time, String countdown) {
        HBox item = new HBox(12);
        item.setAlignment(Pos.CENTER_LEFT);
        item.setPadding(new Insets(12));
        item.setStyle("-fx-background-color: #f8fafc; -fx-border-radius: 8; -fx-background-radius: 8;");
        
        Circle dot = new Circle(6);
        dot.setFill(Color.web("#3b82f6"));
        
        VBox textBox = new VBox(4);
        Label nameLabel = new Label(name);
        nameLabel.setStyle("-fx-font-size: 14px; -fx-font-weight: 600; -fx-text-fill: #0f172a;");
        Label timeLabel = new Label(time + " • " + countdown);
        timeLabel.setStyle("-fx-font-size: 12px; -fx-text-fill: #64748b;");
        textBox.getChildren().addAll(nameLabel, timeLabel);
        
        item.getChildren().addAll(dot, textBox);
        return item;
    }

    private VBox createNotificationsPanel() {
        VBox panel = new VBox(16);
        panel.setPadding(new Insets(24, 20, 24, 20));
        panel.setPrefWidth(300);
        panel.setStyle("-fx-background-color: #ffffff; -fx-border-color: #e2e8f0; -fx-border-width: 0 0 0 1;");
        
        Label title = new Label("🔔 Notifications");
        title.setStyle("-fx-font-size: 18px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        
        VBox notifList = new VBox(12);
        
        // Load from API
        try {
            String resp = api.get("/api/dashboard/notifications");
            Type t = new TypeToken<List<Map<String, String>>>(){}.getType();
            List<Map<String, String>> notifications = gson.fromJson(resp, t);
            
            if (notifications.isEmpty()) {
                Label noNotifs = new Label("No new notifications");
                noNotifs.setStyle("-fx-text-fill: #64748b; -fx-font-size: 13px;");
                notifList.getChildren().add(noNotifs);
            } else {
                for (Map<String, String> notif : notifications) {
                    notifList.getChildren().add(
                        createNotification(
                            notif.getOrDefault("icon", "🔔"),
                            notif.getOrDefault("title", "Notification"),
                            notif.getOrDefault("message", ""),
                            notif.getOrDefault("color", "#3b82f6")
                        )
                    );
                }
            }
        } catch (Exception e) {
            notifList.getChildren().addAll(
                createNotification("💊", "Medication Reminder", "Add medications to get reminders", "#3b82f6"),
                createNotification("🩺", "Wellness Log", "Start logging your wellness", "#10b981")
            );
        }
        
        panel.getChildren().addAll(title, notifList);
        return panel;
    }

    private VBox createNotification(String icon, String title, String message, String color) {
        VBox notif = new VBox(6);
        notif.setPadding(new Insets(12));
        notif.setStyle("-fx-background-color: #f8fafc; -fx-border-radius: 8; -fx-background-radius: 8; -fx-border-color: " + color + "; -fx-border-width: 0 0 0 3;");
        
        HBox header = new HBox(8);
        header.setAlignment(Pos.CENTER_LEFT);
        Label iconLabel = new Label(icon);
        iconLabel.setStyle("-fx-font-size: 18px;");
        Label titleLabel = new Label(title);
        titleLabel.setStyle("-fx-font-size: 13px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        header.getChildren().addAll(iconLabel, titleLabel);
        
        Label messageLabel = new Label(message);
        messageLabel.setWrapText(true);
        messageLabel.setStyle("-fx-font-size: 12px; -fx-text-fill: #64748b;");
        
        notif.getChildren().addAll(header, messageLabel);
        return notif;
    }

    private Node medicationsTab() {
        ScrollPane scroll = new ScrollPane();
        VBox content = new VBox(20);
        content.setPadding(new Insets(24));
        
        // Header
        Label title = new Label("💊 Add New Medication");
        title.setStyle("-fx-font-size: 24px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        
        // Form Card with gradient
        VBox formCard = createCard();
        formCard.setStyle(formCard.getStyle() + "-fx-background-color: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); -fx-padding: 24;");
        
        VBox formContent = new VBox(16);
        
        // Medication Name
        Label nameLabel = new Label("📝 Medication Name");
        nameLabel.setStyle("-fx-text-fill: white; -fx-font-weight: 600; -fx-font-size: 14px;");
        TextField name = new TextField();
        name.setPromptText("e.g., Aspirin, Vitamin D");
        name.setStyle("-fx-background-color: rgba(255,255,255,0.9); -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 12; -fx-font-size: 14px;");
        
        // Dosage
        Label dosageLabel = new Label("💊 Dosage");
        dosageLabel.setStyle("-fx-text-fill: white; -fx-font-weight: 600; -fx-font-size: 14px;");
        TextField dosage = new TextField();
        dosage.setPromptText("e.g., 100mg, 2 tablets");
        dosage.setStyle("-fx-background-color: rgba(255,255,255,0.9); -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 12; -fx-font-size: 14px;");
        
        // Time Schedule
        Label scheduleLabel = new Label("⏰ Schedule (comma-separated times)");
        scheduleLabel.setStyle("-fx-text-fill: white; -fx-font-weight: 600; -fx-font-size: 14px;");
        TextField schedule = new TextField();
        schedule.setPromptText("e.g., 08:00, 14:00, 20:00");
        schedule.setStyle("-fx-background-color: rgba(255,255,255,0.9); -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 12; -fx-font-size: 14px;");
        
        // Add Button
        Button add = new Button("➕ Add Medication");
        add.setStyle("-fx-background-color: white; -fx-text-fill: #f5576c; -fx-border-radius: 10; -fx-background-radius: 10; -fx-padding: 14 28; -fx-font-size: 15px; -fx-font-weight: 700; -fx-cursor: hand;");
        add.setOnMouseEntered(e -> add.setStyle("-fx-background-color: #f8f9fa; -fx-text-fill: #f5576c; -fx-border-radius: 10; -fx-background-radius: 10; -fx-padding: 14 28; -fx-font-size: 15px; -fx-font-weight: 700; -fx-cursor: hand;"));
        add.setOnMouseExited(e -> add.setStyle("-fx-background-color: white; -fx-text-fill: #f5576c; -fx-border-radius: 10; -fx-background-radius: 10; -fx-padding: 14 28; -fx-font-size: 15px; -fx-font-weight: 700; -fx-cursor: hand;"));
        
        formContent.getChildren().addAll(nameLabel, name, dosageLabel, dosage, scheduleLabel, schedule, add);
        formCard.getChildren().add(formContent);
        
        // Medications List
        Label listTitle = new Label("📋 Your Medications");
        listTitle.setStyle("-fx-font-size: 20px; -fx-font-weight: 700; -fx-text-fill: #0f172a; -fx-padding: 20 0 0 0;");
        
        ListView<String> list = new ListView<>();
        list.setStyle("-fx-background-color: white; -fx-border-color: #e2e8f0; -fx-border-radius: 12; -fx-background-radius: 12;");
        list.setPrefHeight(300);
        
        add.setOnAction(e -> {
            try {
                if (name.getText().isEmpty() || dosage.getText().isEmpty() || schedule.getText().isEmpty()) {
                    Alert alert = new Alert(Alert.AlertType.WARNING, "Please fill in all fields!");
                    alert.showAndWait();
                    return;
                }
                Medication m = new Medication();
                m.name = name.getText();
                m.dosage = dosage.getText();
                m.schedule = schedule.getText();
                api.postJson("/api/medications", m);
                name.clear();
                dosage.clear();
                schedule.clear();
                refreshMeds(list);
                Alert success = new Alert(Alert.AlertType.INFORMATION, "✅ Medication added successfully!");
                success.showAndWait();
            } catch (Exception ex) {
                new Alert(Alert.AlertType.ERROR, ex.getMessage()).showAndWait();
            }
        });
        
        content.getChildren().addAll(title, formCard, listTitle, list);
        scroll.setContent(content);
        scroll.setFitToWidth(true);
        scroll.setStyle("-fx-background: #f8fafc; -fx-background-color: #f8fafc;");
        refreshMeds(list);
        return scroll;
    }

    private void refreshMeds(ListView<String> list) {
        try {
            String resp = api.get("/api/medications");
            Type t = new TypeToken<List<Medication>>(){}.getType();
            List<Medication> meds = gson.fromJson(resp, t);
            list.getItems().clear();
            
            if (meds.isEmpty()) {
                list.getItems().add("💊 No medications yet. Add one above!");
            } else {
                for (Medication m : meds) {
                    list.getItems().add(m.name + " (" + m.dosage + ") - " + m.schedule + " [ID:" + m.id + "]");
                }
                
                // Add hint
                list.getItems().add("");
                list.getItems().add("💡 Tip: Double-click any medication to delete it");
            }
            
            // Add delete functionality
            list.setOnMouseClicked(event -> {
                if (event.getClickCount() == 2) {
                    String selected = list.getSelectionModel().getSelectedItem();
                    if (selected != null && selected.contains("[ID:")) {
                        String idStr = selected.substring(selected.indexOf("[ID:") + 4, selected.indexOf("]"));
                        Alert confirm = new Alert(Alert.AlertType.CONFIRMATION, "Delete this medication?");
                        confirm.showAndWait().ifPresent(response -> {
                            if (response == ButtonType.OK) {
                                try {
                                    api.delete("/api/medications/" + idStr);
                                    refreshMeds(list);
                                    Alert success = new Alert(Alert.AlertType.INFORMATION, "✅ Deleted successfully!");
                                    success.showAndWait();
                                } catch (Exception ex) {
                                    new Alert(Alert.AlertType.ERROR, "Failed to delete: " + ex.getMessage()).showAndWait();
                                }
                            }
                        });
                    }
                }
            });
        } catch (Exception e) {
            list.getItems().setAll("Failed to load: " + e.getMessage());
        }
    }

    private Node wellnessTab() {
        ScrollPane scroll = new ScrollPane();
        VBox content = new VBox(20);
        content.setPadding(new Insets(24));
        
        // Header
        Label title = new Label("🌿 Log Your Wellness");
        title.setStyle("-fx-font-size: 24px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        
        // Form Card with gradient
        VBox formCard = createCard();
        formCard.setStyle(formCard.getStyle() + "-fx-background-color: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); -fx-padding: 24;");
        
        VBox formContent = new VBox(16);
        
        // Mood Selection with more options
        Label moodLabel = new Label("😊 How are you feeling?");
        moodLabel.setStyle("-fx-text-fill: white; -fx-font-weight: 600; -fx-font-size: 14px;");
        ComboBox<String> mood = new ComboBox<>();
        mood.getItems().addAll("😄 Excellent", "😊 Good", "🙂 Okay", "😟 Low", "😢 Very Low", "😔 Anxious", "😴 Tired");
        mood.setPromptText("Select your mood");
        mood.setStyle("-fx-background-color: rgba(255,255,255,0.9); -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 12; -fx-font-size: 14px;");
        mood.setPrefWidth(300);
        
        // Energy Level
        Label energyLabel = new Label("⚡ Energy Level: 5");
        energyLabel.setStyle("-fx-text-fill: white; -fx-font-weight: 600; -fx-font-size: 14px;");
        Slider energy = new Slider(1, 10, 5);
        energy.setShowTickLabels(true);
        energy.setShowTickMarks(true);
        energy.setMajorTickUnit(1);
        energy.setBlockIncrement(1);
        energy.setStyle("-fx-background-color: rgba(255,255,255,0.2);");
        energy.valueProperty().addListener((obs, old, val) -> energyLabel.setText("⚡ Energy Level: " + val.intValue()));
        
        // Notes
        Label notesLabel = new Label("📝 Notes (optional)");
        notesLabel.setStyle("-fx-text-fill: white; -fx-font-weight: 600; -fx-font-size: 14px;");
        TextField notes = new TextField();
        notes.setPromptText("How was your day? Any observations?");
        notes.setStyle("-fx-background-color: rgba(255,255,255,0.9); -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 12; -fx-font-size: 14px;");
        
        // Log Button
        Button add = new Button("✅ Log Wellness");
        add.setStyle("-fx-background-color: white; -fx-text-fill: #00f2fe; -fx-border-radius: 10; -fx-background-radius: 10; -fx-padding: 14 28; -fx-font-size: 15px; -fx-font-weight: 700; -fx-cursor: hand;");
        add.setOnMouseEntered(e -> add.setStyle("-fx-background-color: #f8f9fa; -fx-text-fill: #00f2fe; -fx-border-radius: 10; -fx-background-radius: 10; -fx-padding: 14 28; -fx-font-size: 15px; -fx-font-weight: 700; -fx-cursor: hand;"));
        add.setOnMouseExited(e -> add.setStyle("-fx-background-color: white; -fx-text-fill: #00f2fe; -fx-border-radius: 10; -fx-background-radius: 10; -fx-padding: 14 28; -fx-font-size: 15px; -fx-font-weight: 700; -fx-cursor: hand;"));
        
        formContent.getChildren().addAll(moodLabel, mood, energyLabel, energy, notesLabel, notes, add);
        formCard.getChildren().add(formContent);
        
        // Wellness History
        Label listTitle = new Label("📅 Wellness History");
        listTitle.setStyle("-fx-font-size: 20px; -fx-font-weight: 700; -fx-text-fill: #0f172a; -fx-padding: 20 0 0 0;");
        
        ListView<String> list = new ListView<>();
        list.setStyle("-fx-background-color: white; -fx-border-color: #e2e8f0; -fx-border-radius: 12; -fx-background-radius: 12;");
        list.setPrefHeight(300);
        
        add.setOnAction(e -> {
            try {
                if (mood.getValue() == null) {
                    Alert alert = new Alert(Alert.AlertType.WARNING, "Please select your mood!");
                    alert.showAndWait();
                    return;
                }
                WellnessLog wl = new WellnessLog();
                wl.mood = mood.getValue().split(" ")[1]; // Extract mood text without emoji
                wl.energy = (int) energy.getValue();
                wl.notes = notes.getText();
                api.postJson("/api/wellness", wl);
                mood.setValue(null);
                energy.setValue(5);
                notes.clear();
                refreshWellness(list);
                Alert success = new Alert(Alert.AlertType.INFORMATION, "✅ Wellness logged successfully!");
                success.showAndWait();
            } catch (Exception ex) {
                new Alert(Alert.AlertType.ERROR, ex.getMessage()).showAndWait();
            }
        });
        
        content.getChildren().addAll(title, formCard, listTitle, list);
        scroll.setContent(content);
        scroll.setFitToWidth(true);
        scroll.setStyle("-fx-background: #f8fafc; -fx-background-color: #f8fafc;");
        refreshWellness(list);
        return scroll;
    }

    private void refreshWellness(ListView<String> list) {
        try {
            String resp = api.get("/api/wellness");
            Type t = new TypeToken<List<WellnessLog>>(){}.getType();
            List<WellnessLog> logs = gson.fromJson(resp, t);
            list.getItems().clear();
            
            if (logs.isEmpty()) {
                list.getItems().add("🌿 No wellness logs yet. Start logging above!");
            } else {
                for (WellnessLog l : logs) {
                    String item = l.date + ": " + l.mood + " | Energy " + l.energy + (l.notes==null?"":" - "+l.notes) + " [ID:" + l.id + "]";
                    list.getItems().add(item);
                }
                
                // Add hint
                list.getItems().add("");
                list.getItems().add("💡 Tip: Double-click any log to delete it");
            }
            
            // Add delete functionality
            list.setOnMouseClicked(event -> {
                if (event.getClickCount() == 2) {
                    String selected = list.getSelectionModel().getSelectedItem();
                    if (selected != null && selected.contains("[ID:")) {
                        String idStr = selected.substring(selected.indexOf("[ID:") + 4, selected.indexOf("]"));
                        Alert confirm = new Alert(Alert.AlertType.CONFIRMATION, "Delete this wellness log?");
                        confirm.showAndWait().ifPresent(response -> {
                            if (response == ButtonType.OK) {
                                try {
                                    api.delete("/api/wellness/" + idStr);
                                    refreshWellness(list);
                                    Alert success = new Alert(Alert.AlertType.INFORMATION, "✅ Deleted successfully!");
                                    success.showAndWait();
                                } catch (Exception ex) {
                                    new Alert(Alert.AlertType.ERROR, "Failed to delete: " + ex.getMessage()).showAndWait();
                                }
                            }
                        });
                    }
                }
            });
        } catch (Exception e) {
            list.getItems().setAll("Failed to load: " + e.getMessage());
        }
    }
    
    private Node createAnalyticsView() {
        ScrollPane scroll = new ScrollPane();
        VBox content = new VBox(20);
        content.setPadding(new Insets(24));
        
        Label title = new Label("📈 Analytics & Insights");
        title.setStyle("-fx-font-size: 28px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        
        // Weekly Summary Card - Check if data exists
        VBox summaryCard = createCard();
        summaryCard.setStyle(summaryCard.getStyle() + "-fx-background-color: linear-gradient(135deg, #fa709a 0%, #fee140 100%);");
        Label summaryTitle = new Label("📊 Weekly Summary");
        summaryTitle.setStyle("-fx-font-size: 20px; -fx-font-weight: 700; -fx-text-fill: white;");
        
        Label summaryText = new Label();
        summaryText.setWrapText(true);
        summaryText.setStyle("-fx-font-size: 14px; -fx-text-fill: white; -fx-padding: 8 0 0 0;");
        
        // Load real data
        try {
            String resp = api.get("/api/wellness");
            Type t = new TypeToken<List<WellnessLog>>(){}.getType();
            List<WellnessLog> logs = gson.fromJson(resp, t);
            
            if (logs.isEmpty()) {
                summaryText.setText("🌟 Start logging your wellness data to see your weekly summary and insights!");
            } else {
                double avgEnergy = logs.stream().mapToInt(l -> l.energy).average().orElse(0);
                summaryText.setText("You've logged wellness " + logs.size() + " times. Your average energy level is " + String.format("%.1f", avgEnergy) + "/10. Keep it up!");
            }
        } catch (Exception e) {
            summaryText.setText("🌟 Start logging your wellness data to see your weekly summary and insights!");
        }
        
        summaryCard.getChildren().addAll(summaryTitle, summaryText);
        
        // Charts
        HBox chartsRow = new HBox(16);
        chartsRow.getChildren().addAll(createMoodChart());
        
        content.getChildren().addAll(title, summaryCard, chartsRow);
        scroll.setContent(content);
        scroll.setFitToWidth(true);
        scroll.setStyle("-fx-background: #f8fafc; -fx-background-color: #f8fafc;");
        return scroll;
    }
    
    private Node createInsightsView() {
        ScrollPane scroll = new ScrollPane();
        VBox content = new VBox(20);
        content.setPadding(new Insets(24));
        
        Label title = new Label("🤖 AI Wellness Insights");
        title.setStyle("-fx-font-size: 28px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        
        // AI Insights Card 1 - Main Insight
        VBox insight1 = createCard();
        insight1.setStyle(insight1.getStyle() + "-fx-background-color: linear-gradient(135deg, #667eea 0%, #764ba2 100%);");
        Label insight1Title = new Label("🧠 AI Analysis");
        insight1Title.setStyle("-fx-font-size: 20px; -fx-font-weight: 700; -fx-text-fill: white;");
        Label insight1Text = new Label("Loading AI insights...");
        insight1Text.setWrapText(true);
        insight1Text.setStyle("-fx-font-size: 15px; -fx-text-fill: white; -fx-padding: 12 0 0 0;");
        insight1.getChildren().addAll(insight1Title, insight1Text);
        
        // Load real AI insights
        new Thread(() -> {
            try {
                String resp = api.get("/api/dashboard/ai-insights");
                Type t = new TypeToken<Map<String, String>>(){}.getType();
                Map<String, String> insights = gson.fromJson(resp, t);
                String insight = insights.getOrDefault("insight", "Start logging to get insights!");
                
                javafx.application.Platform.runLater(() -> {
                    insight1Text.setText(insight);
                });
            } catch (Exception e) {
                javafx.application.Platform.runLater(() -> {
                    insight1Text.setText("Start logging your wellness data to receive personalized AI insights!");
                });
            }
        }).start();
        
        // Recommendation Card 1
        VBox rec1 = createCard();
        rec1.setStyle(rec1.getStyle() + "-fx-background-color: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);");
        Label rec1Title = new Label("💡 Hydration Reminder");
        rec1Title.setStyle("-fx-font-size: 18px; -fx-font-weight: 700; -fx-text-fill: white;");
        Label rec1Text = new Label("💧 Drink 8 glasses of water daily. Staying hydrated improves energy levels and mood!");
        rec1Text.setWrapText(true);
        rec1Text.setStyle("-fx-font-size: 14px; -fx-text-fill: white; -fx-padding: 12 0 0 0;");
        rec1.getChildren().addAll(rec1Title, rec1Text);
        
        // Recommendation Card 2
        VBox rec2 = createCard();
        rec2.setStyle(rec2.getStyle() + "-fx-background-color: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);");
        Label rec2Title = new Label("😴 Sleep Schedule");
        rec2Title.setStyle("-fx-font-size: 18px; -fx-font-weight: 700; -fx-text-fill: white;");
        Label rec2Text = new Label("⏰ Aim for 7-8 hours of sleep. Consistent sleep schedules boost energy and mental clarity!");
        rec2Text.setWrapText(true);
        rec2Text.setStyle("-fx-font-size: 14px; -fx-text-fill: white; -fx-padding: 12 0 0 0;");
        rec2.getChildren().addAll(rec2Title, rec2Text);
        
        // Recommendation Card 3
        VBox rec3 = createCard();
        rec3.setStyle(rec3.getStyle() + "-fx-background-color: linear-gradient(135deg, #fa709a 0%, #fee140 100%);");
        Label rec3Title = new Label("🏋️ Exercise Tip");
        rec3Title.setStyle("-fx-font-size: 18px; -fx-font-weight: 700; -fx-text-fill: white;");
        Label rec3Text = new Label("🚶 30 minutes of daily exercise can significantly improve your mood and overall wellness!");
        rec3Text.setWrapText(true);
        rec3Text.setStyle("-fx-font-size: 14px; -fx-text-fill: white; -fx-padding: 12 0 0 0;");
        rec3.getChildren().addAll(rec3Title, rec3Text);
        
        // Recommendation Card 4
        VBox rec4 = createCard();
        rec4.setStyle(rec4.getStyle() + "-fx-background-color: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);");
        Label rec4Title = new Label("🧘 Mindfulness");
        rec4Title.setStyle("-fx-font-size: 18px; -fx-font-weight: 700; -fx-text-fill: #1e293b;");
        Label rec4Text = new Label("🌿 Try 10 minutes of meditation or deep breathing daily to reduce stress and anxiety!");
        rec4Text.setWrapText(true);
        rec4Text.setStyle("-fx-font-size: 14px; -fx-text-fill: #1e293b; -fx-padding: 12 0 0 0;");
        rec4.getChildren().addAll(rec4Title, rec4Text);
        
        content.getChildren().addAll(title, insight1, rec1, rec2, rec3, rec4);
        scroll.setContent(content);
        scroll.setFitToWidth(true);
        scroll.setStyle("-fx-background: #f8fafc; -fx-background-color: #f8fafc;");
        return scroll;
    }
    
    private Node createSettingsView() {
        ScrollPane scroll = new ScrollPane();
        VBox content = new VBox(20);
        content.setPadding(new Insets(24));
        
        Label title = new Label("⚙️ Settings");
        title.setStyle("-fx-font-size: 28px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        
        // Theme Settings
        VBox themeCard = createCard();
        Label themeTitle = new Label("Appearance");
        themeTitle.setStyle("-fx-font-size: 18px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        
        HBox themeToggle = new HBox(12);
        themeToggle.setAlignment(Pos.CENTER_LEFT);
        Label themeLabel = new Label("Dark Mode");
        themeLabel.setStyle("-fx-font-size: 14px; -fx-text-fill: #64748b;");
        Button toggleBtn = new Button(theme.isDark() ? "ON" : "OFF");
        toggleBtn.setStyle("-fx-background-color: " + (theme.isDark() ? "#10b981" : "#e5e7eb") + "; -fx-text-fill: white; -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 6 16; -fx-cursor: hand;");
        toggleBtn.setOnAction(e -> {
            theme.toggle();
            toggleBtn.setText(theme.isDark() ? "ON" : "OFF");
            toggleBtn.setStyle("-fx-background-color: " + (theme.isDark() ? "#10b981" : "#e5e7eb") + "; -fx-text-fill: white; -fx-border-radius: 8; -fx-background-radius: 8; -fx-padding: 6 16; -fx-cursor: hand;");
        });
        themeToggle.getChildren().addAll(themeLabel, toggleBtn);
        themeCard.getChildren().addAll(themeTitle, themeToggle);
        
        // Notification Settings
        VBox notifCard = createCard();
        Label notifTitle = new Label("Notifications");
        notifTitle.setStyle("-fx-font-size: 18px; -fx-font-weight: 700; -fx-text-fill: #0f172a;");
        Label notifText = new Label("Manage your notification preferences for medications, wellness reminders, and more.");
        notifText.setWrapText(true);
        notifText.setStyle("-fx-font-size: 14px; -fx-text-fill: #64748b; -fx-padding: 8 0 0 0;");
        notifCard.getChildren().addAll(notifTitle, notifText);
        
        content.getChildren().addAll(title, themeCard, notifCard);
        scroll.setContent(content);
        scroll.setFitToWidth(true);
        scroll.setStyle("-fx-background: #f8fafc; -fx-background-color: #f8fafc;");
        return scroll;
    }
}
