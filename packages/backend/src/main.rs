#![allow(unreachable_code)]

mod api;
mod database;
mod login;
mod server;
mod utils;

#[tokio::main]
async fn main() {
    server::start().await.unwrap()
}
