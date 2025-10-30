package com.medimate.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebController {
    
    @GetMapping("/")
    public String landing() {
        return "forward:/landing.html";
    }
    
    @GetMapping("/app")
    public String app() {
        return "forward:/index.html";
    }
    
    @GetMapping("/caretaker")
    public String caretaker() {
        return "forward:/caretaker.html";
    }
    
    @GetMapping("/admin")
    public String admin() {
        return "forward:/admin.html";
    }
    
    @GetMapping("/dashboard")
    public String dashboard() {
        return "forward:/dashboard.html";
    }
}
