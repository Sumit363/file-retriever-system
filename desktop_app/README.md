# SSH File Fetcher Desktop App

A Tkinter-based Windows desktop GUI that replicates and extends the behavior of the provided PowerShell script. It searches for `*.txt` files on the remote Linux host, allows selecting or copying all results, and downloads them to the configured Windows folder while renaming duplicates with the parent folder name.

## Features
- Enter a base filename (automatically searches for `*name*.txt`).
- SSH key authentication only (no passwords) using `C:\Users\sumit\.ssh\id_ed25519`.
- Executes `find /home/sumit/Downloads -type f -iname '*<name>*.txt' 2>/dev/null` on the remote host.
- Displays results in a list box with options to copy selected or all files.
- Copies to `C:\Users\sumit\OneDrive\Desktop\testsirji`, creating the folder if needed.
- Renames duplicates using `filename_foldername.ext` while copying.
- Shows per-file progress text, keeps the UI responsive via threads, and logs to both the GUI log panel and `desktop_app/logs/remote_fetch.log`.
- Menu item to open the log file directly.

## Running the app (development)
1. Ensure Python 3.10+ is installed on Windows and `pip` is available.
2. Install dependencies:
   ```bash
   pip install -r desktop_app/requirements.txt
   ```
3. Launch the GUI:
   ```bash
   python desktop_app/ssh_file_fetcher.py
   ```

## Building a Windows EXE
PyInstaller can bundle the application into a single-folder EXE. Run these commands from the repository root on Windows:
```bash
pip install -r desktop_app/requirements.txt
pip install pyinstaller
pyinstaller --noconfirm --onefile --name ssh_file_fetcher --add-data "desktop_app/logs;desktop_app/logs" desktop_app/ssh_file_fetcher.py
```
The generated executable will be located in `dist/ssh_file_fetcher.exe`.

## Code Architecture Overview
- `ssh_file_fetcher.py`
  - **Constants** define remote host, user, directories, key, and log file paths.
  - **RemoteFile** dataclass encapsulates path parsing, duplicate-safe destination naming, and building a quoted SCP path for logging.
  - **GuiLogger** bridges the standard logging system with the Tkinter log panel via a queue.
  - **SSHFileFetcherApp** builds the GUI (entry, results list, buttons, progress bar, log panel, and menu) and orchestrates operations.
    - `_search_files` runs the remote `find` command over SSH in a background thread.
    - `_copy_files` streams downloads over SFTP, logging per-file progress and updating the progress bar.
    - `_connect` centralizes Paramiko client creation using the configured private key (no password prompts).
    - Helper methods keep UI state responsive, update status text, and open the log file.

## Notes
- The GUI logs SCP-formatted paths (e.g., `sumit@192.168.1.11:'/path/to/file.txt'`) for clarity while using Paramiko's SFTP for the actual transfer, keeping behavior aligned with the original script without requiring a separate `scp` executable.
- All network operations run in background threads to avoid blocking the interface.
