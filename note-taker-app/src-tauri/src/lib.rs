// Import required libraries
use std::fs;
use std::io::{Error, ErrorKind};
use std::path::Path;
use serde::{Serialize, Deserialize};


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![build_tree_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub enum NodeKind {
    Folder,
    PlainNote,
    PdfNote,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TreeNode {
    pub name: String,
    pub path: String,
    pub kind: NodeKind,
    pub children: Option<Vec<TreeNode>>,
}

// Tauri wrapper for build_tree function
#[tauri::command]
fn build_tree_command(vault_path: String) -> Result<Option<TreeNode>, String> {
    let path = Path::new(&vault_path);
    build_tree(path).map_err(|e| e.to_string())
}

// Function to build file system representation in memory (tree)
fn build_tree(dir: &Path) -> Result<Option<TreeNode>, Error> {
    
    let path = dir;
    let name = path.file_name().ok_or_else(|| Error::new(ErrorKind::InvalidInput, "path has no filename"))?.to_string_lossy().into_owned();
    
    // If item is a folder, check if it is a PDF note bundle or a subfolder
    if path.is_dir() {
        if is_folder_pdf_bundle(&path) {
            // Create PDF tree node
            return Ok(Some(TreeNode {
                name: name,
                path: path.to_string_lossy().into_owned(),
                kind: NodeKind::PdfNote,
                children: None, 
            }))

        } else {
            // If folder is NOT a PDF bundle then we add a node and explore its children recursively
            // Build out the children
            let mut children: Vec<TreeNode> = Vec::new();

            for item in fs::read_dir(path)? {
                let item = item?;
                let child_path = item.path();
            
                if let Some(node) = build_tree(&child_path)? {
                    children.push(node);
                }
            }
            // Create folder node
            return Ok(Some(TreeNode {
                name: name,
                path: path.to_string_lossy().into_owned(),
                kind: NodeKind::Folder,
                children: Some(children),
            }))
        }

    } else { 
        if path.extension().map_or(false, |ext| ext == "md") { // If item is a plain note i.e. a .md file create a plain note node
            return Ok(Some(TreeNode {
                name: name,
                path: path.to_string_lossy().into_owned(),
                kind: NodeKind::PlainNote,
                children: None,
            }))
        } else {
            // File is a not a note, skip it
            return Ok(None);
        }
    }
}

// Helper function to check if a folder is a pdf note bundle
fn is_folder_pdf_bundle(dir: &Path) -> bool {
    let has_pdf = dir.join("source.pdf").exists();
    let has_notes = dir.join("notes.json").exists();

    // Return TRUE if both the source PDF and notes JSON file are present
    has_pdf && has_notes
}

