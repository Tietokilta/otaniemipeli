use deadpool_postgres::{Manager, ManagerConfig, Pool};
use tokio_postgres::NoTls;

pub fn make_pool(conn_str: &str) -> anyhow::Result<Pool> {
    let mgr_cfg = ManagerConfig {
        recycling_method: deadpool_postgres::RecyclingMethod::Fast,
    };
    let mgr = Manager::from_config(conn_str.parse()?, NoTls, mgr_cfg);
    Ok(Pool::builder(mgr).max_size(16).build()?)
}
