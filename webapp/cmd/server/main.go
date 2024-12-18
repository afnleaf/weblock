// main.go

package main

import (
    "log"
    "net/http"

    "weblock/internal/handlers"
)

func main() {
    // index and app routes
    http.Handle("/", handlers.IndexHandler())
    http.Handle("/map", handlers.MapHandler())
    http.Handle("/farm", handlers.FarmHandler())
    http.Handle("/commands", handlers.CommandsHandler())
    //http.Handle("/resources", handlers.ResourcesHandler())
    //http.Handle("/articles/", handlers.ArticlesHandler())

    // serve static files
    fs := http.FileServer(http.Dir("./public"))
    http.Handle("/public/", http.StripPrefix("/public/", fs))

    // host
    log.Println("Serving on http://localhost:4444")
    if err := http.ListenAndServe(":4444", nil); err != nil {
        log.Fatal(err)
    }
}
