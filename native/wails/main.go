// Browser Features native shell (Wails v3).
//
// Serves the unmodified public_html/ BrowserFeatures app inside a Wails
// WebView. The security headers that Cloudflare Pages supplies via
// public_html/_headers are reproduced from native/headers.json so the
// measured capability surface stays identical to the deployed site.
package main

import (
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func main() {
	root, spec, err := loadSite()
	if err != nil {
		log.Fatal(err)
	}

	app := application.New(application.Options{
		Name:        "Browser Features",
		Description: "Measure the web-platform capabilities of the hosting engine",
		Assets: application.AssetOptions{
			Handler:        newSiteHandler(root, spec),
			DisableLogging: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "Browser Features",
		URL:    "/browser-features/",
		Width:  1280,
		Height: 900,
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
