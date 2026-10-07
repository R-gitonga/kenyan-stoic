use std::{env, error::Error, net::SocketAddr};

pub struct Config {
    pub database_url: String,
    pub listen_addr: SocketAddr,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn Error + Send + Sync>> {
        // Missing .env is fine when the environment supplies configuration.
        match dotenvy::dotenv() {
            Ok(_) => {}
            Err(dotenvy::Error::Io(error)) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(_) => return Err("Could not load .env; check its format and permissions".into()),
        }
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| "DATABASE_URL is required; configure backend/.env")?;
        if database_url.trim().is_empty() {
            return Err("DATABASE_URL must not be empty".into());
        }
        let listen_addr = env::var("BACKEND_ADDR")
            .unwrap_or_else(|_| "127.0.0.1:3000".to_owned())
            .parse()
            .map_err(|_| "BACKEND_ADDR must be a valid IP address and port")?;
        Ok(Self {
            database_url,
            listen_addr,
        })
    }
}
