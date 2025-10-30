package com.medimate.app;

import com.medimate.app.net.ApiClient;
import com.medimate.app.ui.DashboardView;
import com.medimate.app.ui.LoginView;
import com.medimate.app.ui.ThemeManager;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;

public class MainApp extends Application {
    private ApiClient api;
    private ThemeManager themeManager;
    private StackPane root;

    @Override
    public void start(Stage stage) {
        api = new ApiClient("http://localhost:8081");
        root = new StackPane();
        Scene scene = new Scene(root, 1000, 700);
        themeManager = new ThemeManager(scene);

        stage.setTitle("MediMate");
        stage.setScene(scene);
        showLogin();
        stage.show();
    }

    private void showLogin() {
        LoginView view = new LoginView(api);
        root.getChildren().setAll(view.getView(() -> showDashboard())) ;
    }

    private void showDashboard() {
        DashboardView view = new DashboardView(api, themeManager, this::logout);
        root.getChildren().setAll(view.getView());
    }

    private void logout() {
        api.setToken(null);
        showLogin();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
