use crate::api::{router as api_router, websocket};
use crate::database::utils::make_pool;
use crate::login::router as login_router;
use http::HeaderValue;
use http::{header, Method};
use std::env;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;

use axum::{middleware, routing::get, Router};
use socketioxide::SocketIo;
use tracing_subscriber::FmtSubscriber;

use crate::utils::state::{all_middleware, AppState, SocketState};

pub async fn start() -> anyhow::Result<()> {
    tracing::subscriber::set_global_default(FmtSubscriber::default())?;

    // Load .env from repo root (../../.env when running from packages/backend/)
    dotenvy::from_filename("../../.env")
        .or_else(|_| dotenvy::dotenv())
        .ok();
    let port = env::var("BACKEND_PORT").unwrap_or_else(|_| {
        eprintln!("PORT environment variable not set");
        "8000".to_string()
    });
    let db_url = match env::var("POSTGRES_URL") {
        Ok(url) => url,
        Err(_) => panic!("POSTGRES_URL must be set"),
    };
    let pool = match make_pool(&db_url) {
        Ok(pool) => pool,
        Err(_) => panic!("Failed to create pool"),
    };
    let frontend_url =
        env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());

    let origin =
        HeaderValue::from_str(&frontend_url).expect("FRONTEND_URL must be a valid Origin header");
    let cors = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_origin([origin, "https://otaniemipeli.seitamaki.fi".parse()?])
        .allow_credentials(true);

    let bind = format!("0.0.0.0:{}", port);
    println!("\nServer started at port {}", port);

    // Create SocketState for websocket handlers (avoids circular dependency)
    let socket_state = SocketState::new(pool);

    // Build SocketIo with SocketState
    let (layer, io) = SocketIo::builder().with_state(socket_state).build_layer();

    // Create AppState for Axum routes (includes SocketIo for emitting from REST endpoints)
    let state = AppState::new(
        make_pool(&db_url).expect("Failed to create pool for app state"),
        io.clone(),
    );

    // Register websocket namespace
    io.ns("/referee", websocket::referee::referee_on_connect);

    let app = Router::new()
        .route(
            "/",
            get(|| async { "The backend for Otaniemipeli is up and running..." }),
        )
        .nest("/login", login_router())
        .nest("/api", api_router(state.clone()))
        .layer(middleware::from_fn(all_middleware))
        .with_state(state)
        .layer(layer)
        .layer(cors);

    let listener = match TcpListener::bind(&bind).await {
        Ok(listener) => listener,
        Err(error) => panic!("Could not bind to {}: {}", bind, error),
    };

    axum::serve(listener, app).await?;
    Ok(())
}
