use anyhow::Result;
use mdns_sd::{ServiceDaemon, ServiceInfo};

pub fn start_mdns_advertising() -> Result<()> {
    let mdns = ServiceDaemon::new()?;

    let hostname = sysinfo::System::host_name()
        .unwrap_or_else(|| "PC".to_string());

    let service_type = "_pccontrol._tcp.local.";
    let instance_name = format!("PC Control - {}", hostname);
    let port = 8421;

    let service_info = ServiceInfo::new(
        service_type,
        &instance_name,
        &hostname,
        (),
        port,
        &[("version", "1.0.0"), ("platform", "windows")][..],
    )?;

    mdns.register(service_info)?;

    tracing::info!("mDNS service advertising started: {}", instance_name);

    // Keep the service running in background
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(60));
        }
    });

    Ok(())
}
