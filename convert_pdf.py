import sys
import os
import subprocess

# 自動安裝 markitdown
try:
    from markitdown import MarkItDown
except ImportError:
    print("未偵測到 markitdown，正在嘗試自動安裝...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "markitdown"], check=True)
        from markitdown import MarkItDown
        print("markitdown 安裝成功！")
    except Exception as e:
        print(f"安裝 markitdown 失敗: {e}。請手動運行 'pip install markitdown'")
        sys.exit(1)

def convert():
    pdf_path = "07-03.pdf"
    md_path = "07-03.md"
    
    if not os.path.exists(pdf_path):
        print(f"找不到檔案: {pdf_path}")
        return
        
    print(f"正在將 {pdf_path} 轉換為 Markdown...")
    try:
        markitdown = MarkItDown()
        result = markitdown.convert(pdf_path)
        
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(result.text_content)
            
        print(f"轉換完成！已存為: {os.path.abspath(md_path)}")
    except Exception as e:
        print(f"轉換過程中出錯: {e}")

if __name__ == "__main__":
    convert()
