use anyhow::Result;
use serde::{Deserialize, Serialize};
use sysinfo::{CpuExt, DiskExt, NetworkExt, ProcessExt, System, SystemExt};
use std::sync::Arc;
use parking_lot::RwLock;
use once_cell::sync::Lazy;

static SYSTEM: Lazy<Arc<RwLock<System>>> = Lazy::new(|| {
    Arc::new(RwLock::new(System::new_all()))
});

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub hostname: String,
    pub os_version: String,
    pub cpu: CpuInfo,
    pub gpu: GpuInfo,
    pub memory: MemoryInfo,
    pub storage: Vec<StorageInfo>,
    pub uptime: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuInfo {
    pub model: String,
    pub cores: usize,
    pub threads: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuInfo {
    pub model: String,
    pub memory: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    pub total: u64,
    pub available: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageInfo {
    pub drive: String,
    pub total: u64,
    pub available: u64,
    #[serde(rename = "type")]
    pub fs_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub timestamp: i64,
    pub cpu: CpuStats,
    pub gpu: GpuStats,
    pub memory: MemoryStats,
    pub network: NetworkStats,
    pub disk: DiskStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuStats {
    pub usage_percent: f32,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuStats {
    pub usage_percent: f32,
    pub temperature: Option<f32>,
    pub memory_used: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    pub used: u64,
    pub available: u64,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkStats {
    pub download_bytes_per_sec: u64,
    pub upload_bytes_per_sec: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskStats {
    pub read_bytes_per_sec: u64,
    pub write_bytes_per_sec: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f32,
    pub memory_bytes: u64,
    pub status: String,
    pub path: String,
    pub user: String,
}

pub fn get_system_info() -> Result<SystemInfo> {
    let mut sys = SYSTEM.write();
    sys.refresh_all();

    let hostname = System::host_name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = format!(
        "{} {}",
        System::name().unwrap_or_else(|| "Unknown".to_string()),
        System::os_version().unwrap_or_else(|| "Unknown".to_string())
    );

    // CPU info
    let cpu_model = sys.global_cpu_info().brand().to_string();
    let cores = sys.physical_core_count().unwrap_or(0);
    let threads = sys.cpus().len();

    // GPU info (try to get NVIDIA GPU info)
    let (gpu_model, gpu_memory) = get_gpu_info();

    // Memory info
    let total_memory = sys.total_memory();
    let available_memory = sys.available_memory();

    // Storage info
    let mut storage = Vec::new();
    for disk in sys.disks() {
        storage.push(StorageInfo {
            drive: disk.name().to_string_lossy().to_string(),
            total: disk.total_space(),
            available: disk.available_space(),
            fs_type: String::from_utf8_lossy(disk.file_system()).to_string(),
        });
    }

    Ok(SystemInfo {
        hostname,
        os_version,
        cpu: CpuInfo {
            model: cpu_model,
            cores,
            threads,
        },
        gpu: GpuInfo {
            model: gpu_model,
            memory: gpu_memory,
        },
        memory: MemoryInfo {
            total: total_memory,
            available: available_memory,
        },
        storage,
        uptime: System::uptime(),
    })
}

pub fn get_system_stats() -> Result<SystemStats> {
    let mut sys = SYSTEM.write();
    sys.refresh_cpu();
    sys.refresh_memory();
    sys.refresh_networks();

    let timestamp = chrono::Utc::now().timestamp_millis();

    // CPU stats
    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let cpu_temp = get_cpu_temperature();

    // GPU stats
    let (gpu_usage, gpu_temp, gpu_mem) = get_gpu_stats();

    // Memory stats
    let total_mem = sys.total_memory();
    let available_mem = sys.available_memory();
    let used_mem = total_mem - available_mem;
    let mem_usage_percent = (used_mem as f32 / total_mem as f32) * 100.0;

    // Network stats
    let (download_rate, upload_rate) = get_network_rates(&sys);

    // Disk stats (simplified - would need more complex tracking)
    let disk_stats = DiskStats {
        read_bytes_per_sec: 0,
        write_bytes_per_sec: 0,
    };

    Ok(SystemStats {
        timestamp,
        cpu: CpuStats {
            usage_percent: cpu_usage,
            temperature: cpu_temp,
        },
        gpu: GpuStats {
            usage_percent: gpu_usage,
            temperature: gpu_temp,
            memory_used: gpu_mem,
        },
        memory: MemoryStats {
            used: used_mem,
            available: available_mem,
            usage_percent: mem_usage_percent,
        },
        network: NetworkStats {
            download_bytes_per_sec: download_rate,
            upload_bytes_per_sec: upload_rate,
        },
        disk: disk_stats,
    })
}

pub fn get_processes() -> Result<Vec<ProcessInfo>> {
    let mut sys = SYSTEM.write();
    sys.refresh_processes();

    let mut processes = Vec::new();

    for (pid, process) in sys.processes() {
        processes.push(ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string(),
            cpu_percent: process.cpu_usage(),
            memory_bytes: process.memory(),
            status: format!("{:?}", process.status()),
            path: process.exe().unwrap_or_default().to_string_lossy().to_string(),
            user: process.user_id()
                .map(|u| u.to_string())
                .unwrap_or_else(|| "Unknown".to_string()),
        });
    }

    Ok(processes)
}

pub fn terminate_process(pid: u32) -> Result<()> {
    use sysinfo::Pid;

    // Protected system processes
    let protected_names = ["System", "csrss.exe", "smss.exe", "wininit.exe", "services.exe"];

    let mut sys = SYSTEM.write();
    sys.refresh_processes();

    let pid = Pid::from_u32(pid);

    if let Some(process) = sys.process(pid) {
        let name = process.name();

        // Check if process is protected
        if protected_names.iter().any(|p| name.eq_ignore_ascii_case(p)) {
            anyhow::bail!("Cannot terminate protected system process");
        }

        if process.kill() {
            Ok(())
        } else {
            anyhow::bail!("Failed to terminate process")
        }
    } else {
        anyhow::bail!("Process not found")
    }
}

fn get_gpu_info() -> (String, u64) {
    // Try to get NVIDIA GPU info
    match nvml_wrapper::Nvml::init() {
        Ok(nvml) => {
            if let Ok(device) = nvml.device_by_index(0) {
                let name = device.name().unwrap_or_else(|_| "Unknown GPU".to_string());
                let memory = device.memory_info()
                    .map(|info| info.total)
                    .unwrap_or(0);
                return (name, memory);
            }
        }
        Err(_) => {}
    }

    ("Unknown GPU".to_string(), 0)
}

fn get_gpu_stats() -> (f32, Option<f32>, u64) {
    match nvml_wrapper::Nvml::init() {
        Ok(nvml) => {
            if let Ok(device) = nvml.device_by_index(0) {
                let usage = device.utilization_rates()
                    .map(|u| u.gpu as f32)
                    .unwrap_or(0.0);

                let temp = device.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)
                    .ok()
                    .map(|t| t as f32);

                let mem_used = device.memory_info()
                    .map(|info| info.used)
                    .unwrap_or(0);

                return (usage, temp, mem_used);
            }
        }
        Err(_) => {}
    }

    (0.0, None, 0)
}

fn get_cpu_temperature() -> Option<f32> {
    // CPU temperature requires platform-specific code
    // For now, return None - could be implemented using Windows WMI
    None
}

fn get_network_rates(sys: &System) -> (u64, u64) {
    let mut total_received = 0;
    let mut total_transmitted = 0;

    for (_name, network) in sys.networks() {
        total_received += network.received();
        total_transmitted += network.transmitted();
    }

    // This gives totals, not rates. For real rates, need to track delta over time
    // For now, returning simplified version
    (total_received, total_transmitted)
}
