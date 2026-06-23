use std::fs;
use std::io;
use std::path::Path;
use serde::{Serialize, Deserialize};

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
