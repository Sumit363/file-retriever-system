"""
Desktop GUI application to search and copy text files from a remote Linux host
using SSH key authentication. Built with Tkinter and Paramiko.
"""
from __future__ import annotations

import logging
import os
import queue
import threading
import tkinter as tk
from dataclasses import dataclass
from pathlib import Path
from tkinter import messagebox, ttk

import paramiko

REMOTE_USER = "sumit"
REMOTE_HOST = "192.168.1.11"
REMOTE_BASE_DIR = "/home/sumit/Downloads"
LOCAL_DEST_DIR = Path(r"C:\\Users\\sumit\\OneDrive\\Desktop\\testsirji")
PRIVATE_KEY_PATH = Path(r"C:\\Users\\sumit\\.ssh\\id_ed25519")
LOG_FILE = Path("desktop_app/logs/remote_fetch.log")


@dataclass
class RemoteFile:
    """Representation of a remote file to copy."""

    full_path: str

    @property
    def folder_leaf(self) -> str:
        parent = Path(self.full_path).parent
        return parent.name

    @property
    def filename(self) -> str:
        return Path(self.full_path).name

    @property
    def filename_without_ext(self) -> str:
        return Path(self.full_path).stem

    @property
    def ext(self) -> str:
        return Path(self.full_path).suffix

    def destination_name(self) -> str:
        return f"{self.filename_without_ext}_{self.folder_leaf}{self.ext}"

    def scp_path(self) -> str:
        quoted = f"'{self.full_path}'"
        return f"{REMOTE_USER}@{REMOTE_HOST}:{quoted}"


class GuiLogger(logging.Handler):
    """Logging handler that forwards records to a Tkinter text widget via a queue."""

    def __init__(self, log_queue: queue.Queue[str]):
        super().__init__()
        self.log_queue = log_queue

    def emit(self, record: logging.LogRecord) -> None:
        msg = self.format(record)
        self.log_queue.put(msg)


class SSHFileFetcherApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("SSH File Fetcher")
        self.geometry("850x600")
        self.resizable(True, True)

        self.log_queue: queue.Queue[str] = queue.Queue()
        self._configure_logging()

        self.search_thread: threading.Thread | None = None
        self.copy_thread: threading.Thread | None = None
        self.remote_results: list[RemoteFile] = []

        self._build_menu()
        self._build_widgets()
        self._poll_log_queue()

    def _configure_logging(self) -> None:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

        formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
        file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
        file_handler.setFormatter(formatter)

        gui_handler = GuiLogger(self.log_queue)
        gui_handler.setFormatter(formatter)

        logging.basicConfig(level=logging.INFO, handlers=[file_handler, gui_handler])
        logging.info("Application started.")

    def _build_menu(self) -> None:
        menubar = tk.Menu(self)
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="Open Log File", command=self._open_log_file)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.destroy)
        menubar.add_cascade(label="File", menu=file_menu)
        self.config(menu=menubar)

    def _build_widgets(self) -> None:
        main_frame = ttk.Frame(self, padding=10)
        main_frame.pack(fill=tk.BOTH, expand=True)

        entry_frame = ttk.Frame(main_frame)
        entry_frame.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(entry_frame, text="Base filename (without .txt):").pack(side=tk.LEFT)
        self.base_entry = ttk.Entry(entry_frame)
        self.base_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        self.base_entry.focus()

        self.search_button = ttk.Button(entry_frame, text="Search", command=self._on_search)
        self.search_button.pack(side=tk.LEFT)

        results_frame = ttk.LabelFrame(main_frame, text="Search Results")
        results_frame.pack(fill=tk.BOTH, expand=True)

        self.results_listbox = tk.Listbox(results_frame, height=10, selectmode=tk.SINGLE)
        self.results_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar = ttk.Scrollbar(results_frame, orient=tk.VERTICAL, command=self.results_listbox.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.results_listbox.config(yscrollcommand=scrollbar.set)

        actions_frame = ttk.Frame(main_frame)
        actions_frame.pack(fill=tk.X, pady=10)

        self.copy_selected_button = ttk.Button(actions_frame, text="Copy Selected", command=self._on_copy_selected)
        self.copy_selected_button.pack(side=tk.LEFT, padx=5)

        self.copy_all_button = ttk.Button(actions_frame, text="Copy All", command=self._on_copy_all)
        self.copy_all_button.pack(side=tk.LEFT, padx=5)

        status_frame = ttk.Frame(main_frame)
        status_frame.pack(fill=tk.X)

        self.progress = ttk.Progressbar(status_frame, mode="determinate")
        self.progress.pack(fill=tk.X, expand=True)

        self.status_label = ttk.Label(status_frame, text="Idle")
        self.status_label.pack(anchor=tk.W, pady=(5, 0))

        log_frame = ttk.LabelFrame(main_frame, text="Log Output")
        log_frame.pack(fill=tk.BOTH, expand=True, pady=(10, 0))

        self.log_text = tk.Text(log_frame, height=10, state=tk.DISABLED, wrap=tk.WORD)
        self.log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        log_scroll = ttk.Scrollbar(log_frame, orient=tk.VERTICAL, command=self.log_text.yview)
        log_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.log_text.config(yscrollcommand=log_scroll.set)

    def _poll_log_queue(self) -> None:
        try:
            while True:
                msg = self.log_queue.get_nowait()
                self.log_text.configure(state=tk.NORMAL)
                self.log_text.insert(tk.END, msg + "\n")
                self.log_text.configure(state=tk.DISABLED)
                self.log_text.see(tk.END)
        except queue.Empty:
            pass
        self.after(200, self._poll_log_queue)

    def _on_search(self) -> None:
        base_name = self.base_entry.get().strip()
        if not base_name:
            messagebox.showwarning("Input Required", "Please enter a base filename without .txt")
            return

        if self.search_thread and self.search_thread.is_alive():
            messagebox.showinfo("Search Running", "A search is already in progress.")
            return

        self._set_ui_state(disabled=True)
        self._set_status(f"Searching for *{base_name}*.txt ...")
        self.progress.configure(mode="indeterminate")
        self.progress.start(10)

        self.search_thread = threading.Thread(target=self._search_files, args=(base_name,), daemon=True)
        self.search_thread.start()

    def _search_files(self, base_name: str) -> None:
        try:
            client = self._connect()
        except Exception as exc:
            self._report_error(f"Failed to connect: {exc}")
            self._reset_ui()
            return

        pattern = f"'*{base_name}*.txt'"
        find_cmd = f"find {REMOTE_BASE_DIR} -type f -iname {pattern} 2>/dev/null"
        logging.info("Running search: %s", find_cmd)

        try:
            stdin, stdout, stderr = client.exec_command(find_cmd)
            remote_files = [line.strip() for line in stdout if line.strip()]
            error_output = stderr.read().decode().strip()
            if error_output:
                logging.warning("Search stderr: %s", error_output)
        except Exception as exc:
            self._report_error(f"Search failed: {exc}")
            client.close()
            self._reset_ui()
            return

        client.close()
        self.remote_results = [RemoteFile(path) for path in remote_files]

        def update_results() -> None:
            self.results_listbox.delete(0, tk.END)
            if not self.remote_results:
                self._set_status("No matching files found.")
                messagebox.showinfo("No Results", "No matching files found.")
            else:
                for item in self.remote_results:
                    self.results_listbox.insert(tk.END, item.full_path)
                self._set_status(f"Found {len(self.remote_results)} file(s).")
            self._reset_ui()

        self.after(0, update_results)

    def _on_copy_selected(self) -> None:
        selection = self.results_listbox.curselection()
        if not selection:
            messagebox.showwarning("Selection Required", "Please select a file to copy.")
            return
        file_to_copy = [self.remote_results[selection[0]]]
        self._start_copy(file_to_copy)

    def _on_copy_all(self) -> None:
        if not self.remote_results:
            messagebox.showwarning("No Results", "No files to copy. Run a search first.")
            return
        self._start_copy(self.remote_results)

    def _start_copy(self, files: list[RemoteFile]) -> None:
        if self.copy_thread and self.copy_thread.is_alive():
            messagebox.showinfo("Copy Running", "A copy operation is already running.")
            return

        LOCAL_DEST_DIR.mkdir(parents=True, exist_ok=True)
        self._set_ui_state(disabled=True)
        self.progress.configure(mode="determinate", maximum=len(files), value=0)
        self._set_status("Starting copy...")
        self.copy_thread = threading.Thread(target=self._copy_files, args=(files,), daemon=True)
        self.copy_thread.start()

    def _copy_files(self, files: list[RemoteFile]) -> None:
        try:
            client = self._connect()
            sftp = client.open_sftp()
        except Exception as exc:
            self._report_error(f"Failed to connect for copy: {exc}")
            self._reset_ui()
            return

        for index, remote_file in enumerate(files, start=1):
            dest_filename = remote_file.destination_name()
            dest_path = LOCAL_DEST_DIR / dest_filename
            status_msg = f"Copying {remote_file.full_path} → {dest_path}"
            logging.info(status_msg)
            logging.debug("SCP path: %s", remote_file.scp_path())

            def update_status() -> None:
                self._set_status(status_msg)
                self.progress.configure(value=index)

            self.after(0, update_status)

            try:
                sftp.get(remote_file.full_path, str(dest_path))
            except FileNotFoundError:
                logging.error("Remote file not found: %s", remote_file.full_path)
            except Exception as exc:  # noqa: BLE001
                logging.exception("Failed to copy %s: %s", remote_file.full_path, exc)

        sftp.close()
        client.close()

        def finish() -> None:
            self._set_status(f"Done. Files saved to {LOCAL_DEST_DIR}")
            self._reset_ui()

        self.after(0, finish)

    def _connect(self) -> paramiko.SSHClient:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        logging.info("Connecting to %s@%s using key %s", REMOTE_USER, REMOTE_HOST, PRIVATE_KEY_PATH)
        private_key = paramiko.Ed25519Key.from_private_key_file(PRIVATE_KEY_PATH)
        client.connect(
            REMOTE_HOST,
            username=REMOTE_USER,
            pkey=private_key,
            look_for_keys=False,
            allow_agent=False,
            banner_timeout=10,
        )
        return client

    def _set_ui_state(self, disabled: bool) -> None:
        state = tk.DISABLED if disabled else tk.NORMAL
        for widget in [self.search_button, self.copy_selected_button, self.copy_all_button, self.base_entry]:
            widget.configure(state=state)

    def _reset_ui(self) -> None:
        self.after(0, self.progress.stop)
        self.after(0, lambda: self.progress.configure(value=0))
        self.after(0, lambda: self.progress.configure(mode="determinate"))
        self.after(0, lambda: self._set_ui_state(disabled=False))

    def _set_status(self, message: str) -> None:
        self.status_label.configure(text=message)

    def _report_error(self, message: str) -> None:
        logging.error(message)
        self.after(0, lambda: messagebox.showerror("Error", message))

    def _open_log_file(self) -> None:
        try:
            if os.name == "nt":
                os.startfile(LOG_FILE)  # type: ignore[attr-defined]
            elif os.name == "posix":
                os.system(f"xdg-open '{LOG_FILE}' 2>/dev/null || open '{LOG_FILE}' 2>/dev/null")
        except Exception as exc:  # noqa: BLE001
            messagebox.showerror("Error", f"Unable to open log file: {exc}")


def main() -> None:
    app = SSHFileFetcherApp()
    app.mainloop()


if __name__ == "__main__":
    main()
