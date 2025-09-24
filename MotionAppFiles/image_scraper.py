import os
import sys
import requests
import urllib.parse
import urllib.request
import json
from urllib.parse import quote, urlparse
from bs4 import BeautifulSoup
import requests
from excel_parse import get_entries, get_context_urls
from autoimage import resize_images
from urllib.parse import urlparse
import tkinter as tk
from tkinter import filedialog, messagebox
from PIL import Image, ImageTk
import threading
from tkinter.filedialog import askopenfilename
import json
import re
import requests, certifi
from io import BytesIO
from colorama import init as _cinit, Fore, Style # type: ignore
import logging

# Configure logging to write to a file and optionally print to the terminal
logging.basicConfig(
    level=logging.DEBUG,  # Set the logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    format="%(asctime)s [%(levelname)s] %(message)s",  # Log format
    handlers=[
        logging.FileHandler("scraper_logs.txt"),  # Log to a file
        logging.StreamHandler()  # Optional: Log to the terminal
    ]
)

# ========== colored logging (drop-in) ==========
VERBOSE = True  # set False to reduce noise

try:
    from colorama import init as _cinit, Fore, Style # type: ignore
    _cinit(autoreset=True)
except Exception:
    class _Dummy:
        def __getattr__(self, *_): return ""
    Fore = Style = _Dummy()

def _log(prefix, color, msg, dim=False):
    pre = f"{color}[{prefix}]{Style.RESET_ALL} "
    log_message = f"[{prefix}] {msg}"

    # Print to the terminal with color
    if dim:
        print(f"{Fore.WHITE}{Style.DIM}{pre}{msg}{Style.RESET_ALL}")
    else:
        print(pre + msg)

    # Log to the file (without color)
    if prefix == "STEP":
        logging.info(log_message)
    elif prefix == "SEARCH":
        logging.info(log_message)
    elif prefix == "CANDIDATE":
        logging.debug(log_message)
    elif prefix == "OK":
        logging.info(log_message)
    elif prefix == "FILTER" or prefix == "SKIP":
        logging.warning(log_message)
    elif prefix == "ERR":
        logging.error(log_message)
    elif prefix == "DBG":
        logging.debug(log_message)

def log_step(msg):      _log("STEP",   Fore.CYAN,    msg)
def log_search(msg):    _log("SEARCH", Fore.BLUE,    msg)
def log_cand(msg):      _log("CANDIDATE", Fore.MAGENTA, msg)
def log_ok(msg):        _log("OK",     Fore.GREEN,   msg)
def log_filter(msg):    _log("FILTER", Fore.YELLOW,  msg)
def log_skip(msg):      _log("SKIP",   Fore.YELLOW,  msg)
def log_err(msg):       _log("ERR",    Fore.RED,     msg)
def log_dbg(msg):
    if VERBOSE: _log("DBG", Fore.WHITE, msg, dim=True)
# =============================================================

if os.name == 'nt':  # Windows
    CONFIG_DIR = os.path.join(os.environ["USERPROFILE"], "ImageScraperFiles")
else:  # Unix-like (Linux/Mac)
    CONFIG_DIR = os.path.join(os.environ["HOME"], "ImageScraperFiles")

CONFIG_FILE = os.path.join(CONFIG_DIR,"config.json")

os.makedirs(CONFIG_DIR, exist_ok=True)

should_stop = False # Flag to check if scraping should stop
running = False # Flag to check if scraping is in progress
man_website = False # True if manufacturer website is used

# Function to check if url is valid
def is_valid_url(url):
    parsed = urlparse(url)
    return bool(parsed.netloc) and bool(parsed.scheme)

def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

# Function to produce search URLs
def fetch_image_urls(manufacturer, part_number, con_url, description):
    #prefer Bing full-size URLs (murl) and skip known thumbnail hosts
    #scrape was returning too many thumbnails, block known thumb hosts

    global man_website
    num_images = 20
    headers = {"User-Agent": "Mozilla/5.0"}

    if man_website: # 1. manufacturer website mode
        if part_number: # if part number is available
            search_query = f'site:{con_url} "{manufacturer} {part_number}"'
        else: # fallback to description if no part number
            search_query = f'site:{con_url} "{manufacturer} {description}"'

    if not man_website and part_number: # 2. Try known distributor/product sites (exact SKU match)
        search_query = f'site:trusted_distributor.com "{manufacturer} {part_number}"'

    else: # 3. generic web search mode
        if part_number:
            search_query = f'"{manufacturer} {part_number}"'
        else:
            search_query = f'"{manufacturer} {description}"'

    # add negative terms to avoid logos/icons/etc.
    NEG = "-logo -logos -icon -icons -vector -clipart -illustration -banner -headquarters -building -sign -brand"
    q = f"{search_query} {NEG}"

    # Bing Images with "large photos" filter helps quality a lot
    #Bing Images with large-photo filter; Google unchanged
    google_url = f"https://www.google.com/search?tbm=isch&q={urllib.parse.quote(q)}"
    bing_url = f"https://www.bing.com/images/search?q={urllib.parse.quote(q)}&qft=%2Bfilterui%3Aimagesize-large%2Bfilterui%3Aphoto-photo"

    log_search(f"mode={'manufacturer' if man_website else 'generic'} | q={q}")
    log_search("bing images:  " + bing_url)
    log_search("google imgs:  " + google_url)

    image_urls = []
    seen = set()
    THUMB_HOSTS = {
        "encrypted-tbn0.gstatic.com",
        "tse1.mm.bing.net", "tse2.mm.bing.net", "tse3.mm.bing.net", "tse4.mm.bing.net",
    }

    def add(u):
        if not u or not u.startswith("http"): 
            return
        host = urlparse(u).netloc.lower()
        if host in THUMB_HOSTS:
            log_skip(f"thumb host: {u}")
            return
        if u not in seen:
            seen.add(u)
            image_urls.append(u)
            if len(image_urls) <= 5:
                log_cand(u)

    # 1) Try to pull Bing full-size targets from anchor metadata (murl)
    try:
        log_dbg("parsing Bing anchors for full-size URLs (murl)")
        r = requests.get(bing_url, headers=headers, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for a in soup.select("a.iusc, a.iuscp"):
            meta_raw = a.get("m") or a.get("mad")
            if not meta_raw:
                continue
            try:
                meta = json.loads(meta_raw)
            except Exception:
                continue
            murl = meta.get("murl") or meta.get("murl2")
            add(murl)
            if len(image_urls) >= num_images:
                break
    except Exception as e:
        log_err(f"Bing parse failed: {e}")

    # 2) Fallback: scrape <img> on Google, but skip thumb hosts
    if len(image_urls) < num_images:
        try:
            log_dbg("fallback: parsing Google <img> tags")
            r = requests.get(google_url, headers=headers, timeout=15)
            soup = BeautifulSoup(r.text, "html.parser")
            for img in soup.find_all("img"):
                src = img.get("src") or img.get("data-src")
                add(src)
                if len(image_urls) >= num_images:
                    break
        except Exception as e:
            log_err(f"Google parse failed: {e}")

    log_ok(f"Total image URLs selected: {len(image_urls)}")
    return image_urls


def safe_name(s: str, max_len=120) -> str:
    # replace path separators first
    s = s.replace("/", "_").replace("\\", "_")
    # drop quotes that confuse shells/FS
    s = s.replace('"', '').replace("'", "")
    # collapse anything not alnum, dot, dash, underscore into underscore
    s = re.sub(r"[^A-Za-z0-9._-]+", "_", s)
    # trim and shorten
    s = s.strip("._-")[:max_len]
    return s or "img"


# Function to download images and name them "ManufacturerName"_"PartNumber"
def download_images(image_urls, manufacturer, part_number, output_dir):
    save_dir = f"{output_dir}/images/staging"
    os.makedirs(save_dir, exist_ok=True)
    sess = requests.Session()
    sess.headers.update({"User-Agent": "Mozilla/5.0"})

    for idx, img_url in enumerate(image_urls):
        log_step(f"Downloading [{idx+1}/{len(image_urls)}]: {img_url}")
        try:
            resp = sess.get(img_url, timeout=20, stream=True)
            resp.raise_for_status()
            content = resp.content

            #byte-size gate (~20KB)
            if len(content) < 20000:
                log_skip(f"Too small (bytes={len(content)}): {img_url}")
                continue

            #pixel-size gate (>= 400x400)
            try:
                im = Image.open(BytesIO(content))
                w, h = im.size
                if w < 400 or h < 400:
                    log_skip(f"Too small dimensions ({w}x{h}): {img_url}")
                    continue
            except Exception:
                log_skip(f"Invalid image data: {img_url}")
                continue

            stem = re.sub(r"[^A-Za-z0-9._-]+", "_", f"{manufacturer}_{part_number}_{idx}").strip("._-")[:120] or "img"
            img_path = os.path.join(save_dir, f"{stem}.jpg")
            with open(img_path, "wb") as f:
                f.write(content)
            log_ok(f"Saved: {img_path}")
            log_dbg(f"from: {img_url}")
        except Exception as e:
            log_err(f"Failed to download {img_url}: {e}")


def clear_directory(output_dir):
    dir_path = f"{output_dir}/images/staging"
    for filename in os.listdir(dir_path):
        file_path = os.path.join(dir_path, filename)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
        except Exception as e:
            log_err(f"Failed to delete {file_path}. Reason: {e}")
    log_ok("Staging directory cleared.")

def custom_file_dialog(option):
    global running
    if running:
        messagebox.showwarning("Warning", "Scraping is already in progress.")
        return

    file_types = [("Excel files", "*.xlsx"), ("All files", "*.*")]

    file_path = askopenfilename(
        initialdir="/host_files",  # Your Docker-mounted directory
        title="Select an Excel file",
        filetypes=file_types
    )

    if file_path:  # If a file is selected
        if option == 0:
            file_var.set(file_path)
        elif option == 1:
            context_var.set(file_path)
    else:
        messagebox.showwarning("Warning", "No file selected.")

def run():
    global running, should_stop
    if running:
        messagebox.showwarning("Warning", "Scraping is already in progress.")
        return
    running = True
    should_stop = False
    run_button.config(state=tk.DISABLED)
    messagebox.showinfo("Info", "Scraping started.")
    log_step("Scraping started.")
    excel_file = file_var.get()
    context_file = context_var.get()
    output_dir = output_var.get()
    try:
        entry_range_x = int(entry_var_x.get())
        entry_range_y = int(entry_var_y.get())
    except ValueError:
        messagebox.showerror("Error", "Please enter valid entry range.")
        running = False
        return
    scraping_thread = threading.Thread(target=start_scraping, args=(excel_file,entry_range_x,entry_range_y,context_file,output_dir,))
    scraping_thread.start()
    running = False
    return

def start_scraping(excel_file, entry_range_x, entry_range_y, context_file,output_dir):
    global current_entry_index, total_entry_count, man_website,running
    entries = get_entries(excel_file)  # Fetch entries as tuples
    context_urls = get_context_urls(context_file)
    total_entry_count = len(entries) + 1
    last_manufacturer = ""
    repeat = 0
    if entries and context_urls:
        for i, (manufacturer, part_number, description, id) in enumerate(entries):
            global should_stop
            if should_stop:
                break
            if (entry_range_x != 0 and i < entry_range_x -1) or (entry_range_y != 0 and entry_range_y <= i):
                continue
            if manufacturer != last_manufacturer:
                for (url_manufacturer, url) in (context_urls):
                    if manufacturer == url_manufacturer:
                        con_url = url
                        man_website = True
                        break
                    else:
                        con_url = ""
                        man_website = False
                last_manufacturer = manufacturer
            current_entry_index = i + 1
            tk.Label(frame, text= f"Entry ({current_entry_index}/{total_entry_count})").grid(row=6,column=1,padx=10,pady=10)
            log_step(f"({i + 1}/{len(entries)}) Searching images for: {manufacturer} | PN='{part_number}' | id={id}")
            if man_website:
                log_search(f"Manufacturer site mode: {con_url}")
            else:
                log_search("Generic search mode")
            image_urls = fetch_image_urls(manufacturer, part_number, con_url, description)
            if image_urls:
                log_step("Downloading images...")
                download_images(image_urls, manufacturer, part_number,output_dir)
                if man_website:
                    resize_images(f"{output_dir}/images/staging", f"{output_dir}/images/specific/{manufacturer}/{id}")
                else:
                    resize_images(f"{output_dir}/images/staging", f"{output_dir}/images/generic/{manufacturer}/{id}")
                clear_directory(output_dir)
            else:
                log_skip(f"No images found for {manufacturer} {part_number}.")
    else:
        log_err("No valid entries found in the Excel file.")
    
    running = False
    run_button.config(state=tk.NORMAL)
    log_ok("Scraping finished.")
    return

def on_closing():
    global should_stop
    if messagebox.askokcancel("Quit", "Do you want to quit?"):
        should_stop = True
        root.destroy()

def stop_running():
    global should_stop, current_entry_index, running
    should_stop = True
    running = False
    messagebox.showinfo("Info", f"Scraping stopped at entry {current_entry_index}.")
    return

def clear_fields():
    entry_var_x.set("")
    entry_var_y.set("")
    file_var.set("")
    context_var.set("")
    output_var.set("")

def reset_all():
    clear_fields()
    messagebox.showinfo("Reset", "All fields have been cleared.")
    
def save_config(name, value):
    config = {}
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
    config[name] = value
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f)

def load_config(name):
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
            return config.get(name, "")
    return ""

# Main Function 
if __name__ == "__main__":
    root = tk.Tk()
    root.config(padx=30, pady=30) 
    root.title("")

    if os.name == 'nt':
        root.state('zoomed')
    else:
        root.attributes('-fullscreen')

    file_var = tk.StringVar()
    file_var.set(load_config("file_var"))
    output_var = tk.StringVar()
    output_var.set(load_config("output_var"))
    context_var = tk.StringVar()
    context_var.set(load_config("context_var"))
    entry_var_x = tk.StringVar()
    entry_var_y = tk.StringVar()
    frame = tk.Frame(root)
    frame.pack(expand=True)

    image_path = resource_path("Motion_PP_SQ.png")
    img = Image.open(image_path)
    img = img.resize((200, 200), Image.LANCZOS)
    photo = ImageTk.PhotoImage(img)

    img_label = tk.Label(frame, image=photo)
    img_label.grid(row=0, column=0, columnspan=3, pady=5)

    # Range of entries
    tk.Label(frame, text="Enter range of Entries (x,y) or 0,0 for All:", anchor="w").grid(row=1, column=0, sticky="w", padx=5, pady=5)
    tk.Entry(frame, textvariable=entry_var_x, width=10, bd=1, relief="solid", highlightthickness=2).grid(row=1, column=1, padx=5, pady=5, sticky="w") 
    tk.Entry(frame, textvariable=entry_var_y, width=10, bd=1, relief="solid", highlightthickness=2).grid(row=1, column=1, padx=5, pady=5, sticky="e") 

    # Excel file input
    tk.Label(frame, text="Select Excel File for input:").grid(row=2, column=0, sticky="w", padx=5, pady=5)
    tk.Entry(frame, textvariable=file_var, width=50, bd=1, relief="solid", highlightthickness=2).grid(row=2, column=1, padx=5, pady=5, sticky="ew")
    tk.Button(frame, text="Browse", command=lambda: [
        file_var.set(askopenfilename(initialdir="/host_files", filetypes=[("Excel files", "*.xlsx")], title="Select an Excel file")),
        save_config("file_var", file_var.get())
        ]
    ).grid(row=2, column=2, padx=5, pady=5)

    # Content URLs
    tk.Label(frame, text="Select Excel File for context URLs:").grid(row=3, column=0, sticky="w", padx=5, pady=5)
    tk.Entry(frame, textvariable=context_var, width=50, bd=1, relief="solid", highlightthickness=2).grid(row=3, column=1, padx=5, pady=5, sticky="ew")
    tk.Button(frame, text="Browse", command=lambda: [
        context_var.set(askopenfilename(initialdir="/host_files", filetypes=[("Excel files", "*.xlsx")], title="Select an Excel file")),
        save_config("context_var", context_var.get())
        ]
        ).grid(row=3, column=2, padx=5, pady=5)

    # Clear, Run, Stop buttons
    tk.Button(frame, text="Clear", command=clear_fields).grid(row=5, column=0, padx=5, pady=10)
    run_button = tk.Button(frame, text="Run", command=run)
    run_button.grid(row=5, column=1, padx=5, pady=10)
    tk.Button(frame, text="Stop", command=stop_running).grid(row=5, column=2, padx=5, pady=10)
    tk.Button(frame, text="Reset", command=reset_all).grid(row=5, column=3, padx=5, pady=10)
    
    #Output directory button
    tk.Label(frame, text="Select a Destination for output:").grid(row=4, column=0, sticky="w", padx=5, pady=5)
    tk.Entry(frame, textvariable=output_var, width=50, bd=1, relief="solid", highlightthickness=2).grid(row=4, column=1, padx=5, pady=5, sticky="ew")
    tk.Button(frame, text="Browse", command=lambda: [
        output_var.set(filedialog.askdirectory(initialdir="/host_files", title="Select a Destination for output")),
        save_config("output_var", output_var.get())
        ]
        ).grid(row=4, column=2, padx=5, pady=5)

    root.protocol("WM_DELETE_WINDOW", on_closing)

    root.mainloop()
