package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"

	"wt-manager/internal/app"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	application := app.New()

	err := wails.Run(&options.App{
		Title:  "wt-manager",
		Width:  1024,
		Height: 768,
		// メイン面 (slate-100) と揃える
		BackgroundColour: &options.RGBA{R: 241, G: 245, B: 249, A: 255},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Windows: &windows.Options{
			IsZoomControlEnabled: false,
			// タイトルバー（ウィンドウ移動用の帯）をメイン面より一段暗くする (slate-200)
			CustomTheme: &windows.ThemeSettings{
				LightModeTitleBar:          windows.RGB(226, 232, 240),
				LightModeTitleBarInactive:  windows.RGB(226, 232, 240),
				LightModeTitleText:         windows.RGB(15, 23, 42),
				LightModeTitleTextInactive: windows.RGB(100, 116, 139),
				LightModeBorder:            windows.RGB(203, 213, 225),
				LightModeBorderInactive:    windows.RGB(203, 213, 225),
			},
		},
		OnStartup:  application.Startup,
		OnShutdown: application.Shutdown,
		Bind: []interface{}{
			application,
		},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
