package com.medimate.app.ui;

import javafx.scene.Scene;

public class ThemeManager {
    private final Scene scene;
    private boolean dark = false;

    public ThemeManager(Scene scene) {
        this.scene = scene;
        apply();
    }

    public void toggle() {
        dark = !dark;
        apply();
    }

    public boolean isDark() { return dark; }

    private void apply() {
        scene.getStylesheets().clear();
        if (dark) {
            scene.getStylesheets().add(getClass().getResource("/styles/dark.css").toExternalForm());
        } else {
            scene.getStylesheets().add(getClass().getResource("/styles/light.css").toExternalForm());
        }
    }
}
