use std::fs;
use std::io;
use std::path::Path;

fn main() {
    let folder = "/home/nichmol/Documents/test";
    let path = Path::new(folder);
    println!("{}", path.display());
}