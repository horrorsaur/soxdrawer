package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"soxdrawer/internal/auth"
	"soxdrawer/internal/config"
)

func main() {
	configPath := flag.String("config", config.DefaultConfigFile, "Path to the configuration file")
	username := flag.String("username", "", "Username of the user to create or update")
	password := flag.String("password", "", "Password for the user")
	isAdmin := flag.Bool("admin", false, "Set user as admin")

	flag.Parse()

	if *username == "" || *password == "" {
		fmt.Println("Usage: user-admin -config <path> -username <name> -password <pass> [-admin]")
		os.Exit(1)
	}

	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	user := &auth.User{
		Username: *username,
		IsAdmin:  *isAdmin,
	}

	if err := user.SetPassword(*password); err != nil {
		log.Fatalf("Failed to set password: %v", err)
	}

	cfg.Users[*username] = user

	if err := config.SaveConfig(cfg, *configPath); err != nil {
		log.Fatalf("Failed to save config: %v", err)
	}

	fmt.Printf("User '%s' created/updated successfully.\n", *username)
}
