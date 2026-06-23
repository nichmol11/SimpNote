// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_lib::run();
}

// Function to build file system representation in memory (tree)
#[tauri::command]
fn build_tree(dir: Path) -> TreeNode{
    
    //Check folder exists
    if !dir.exists() {
        eprintln!("Error: Folder '{}' does not exist.", )
    }
}
