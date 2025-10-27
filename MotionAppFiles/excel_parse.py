import pandas as pd

def get_entries(file_path):
    try:
        df = pd.read_excel(file_path)
        #For testing purposes, limit the number of rows to 10
        #df = pd.read_excel(file_path, nrows=10)
        if all(c in df.columns for c in ["MFR_NAME", "Part Number", "ITEM_NO", "Product Description", "[<ID>]"]):
            # Convert each row to a tuple (manufacturer, part_number, Product Description, [<ID>])
            df = df.sort_values(by="MFR_NAME")
            entries = [tuple(row) for row in df[["MFR_NAME", "Part Number", "ITEM_NO", "Product Description", "[<ID>]"]].dropna().values]
            return entries
        else:
            print("Required columns not found in the Excel file.")
            return []
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return []
# excel_parse.py  (only this function changes)
def get_context_urls(file_path):
    try: 
        df = pd.read_excel(file_path)

        # Prefer the 3-column version when available:
        if all(c in df.columns for c in ["MFR_NAME", "URL", "ENTERPRISE_NAME"]):
            df = df.sort_values(by="MFR_NAME")
            # tuples: (manufacturer, url, enterprise_name)
            entries = [tuple(row) for row in df[["MFR_NAME", "URL", "ENTERPRISE_NAME"]].dropna().values]
            return entries

        # Fallback to original 2-column behavior (no source labeling):
        if "MFR_NAME" in df.columns and "URL" in df.columns:
            df = df.sort_values(by="MFR_NAME")
            entries = [tuple(row) for row in df[["MFR_NAME", "URL"]].dropna().values]
            return entries

        print("Required columns not found in the Excel file.")
        return []
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return []

    
if __name__ == "__main__":
    excel_file = input("Enter the Excel file path: ")  #Input file path as ~/Directory/fileName.xlsx
    entry = get_entries(excel_file)
    if entry:
        print(f"First entry: {entry}")
    else:
        print("No valid entries found.")
