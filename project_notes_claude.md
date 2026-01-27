# Project Description
This project aims to provide a simple and light-weight application designed to take notes about PDF documents. The primary use case is for students to take notes next to their lecture slides. A seperate string is tied to each PDF page which holds the users notes.

The project is being written using Svelte (specifically Typescript is being used for logic) and Tauri, targetting modern desktop linux distributions.

The UI consists of a sidebar that allows the user to access and organise their notes. Users can rename notes, delete them, change their order in a folder and move them between folders which can also be re-ordered, renamed and deleted. The state of the current folders are stored in workspace.json within the user selected working directory.

# Next Steps/Project goals
* Get PDF saving function working (the PDF the user opens should be copied to the user's storage directory when they save a note). Currently a JSON file for the note is saved correctly but the PDF is not.
* Add an autosave function, so once a user has saved a note, any changes to the notes within are saved automatically.
* Use marked.js to enable the use of markdown syntax in notes and add a toggle to switch between rendered/unrendered markdown text.
* Add the ability to zoom and pan the notes/PDF section (i.e. the PageRow.svelte component)
* Optimise PDF.js rendering quality (using Tauri, PDFs appear a little blurry on Tauri, thoguh seem fine in a web browser)
* Clean and simplify code base and remove unused packages.

