import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Extrator de Arquivos")
        
        # Frame principal
        self.frame = tk.Frame(self.root)
        self.frame.pack(padx=10, pady=10)
        
        # Botão para selecionar pasta
        self.select_folder_button = tk.Button(self.frame, text="Selecionar Pasta", command=self.select_folder)
        self.select_folder_button.pack(pady=5)
        
        # Treeview para mostrar os arquivos da pasta
        self.tree = ttk.Treeview(self.frame, columns=("Nome", "Caminho"), show="headings")
        self.tree.heading("Nome", text="Nome do Arquivo")
        self.tree.heading("Caminho", text="Caminho Completo")
        self.tree.pack(pady=5)
        
        # Scrollbar para a Treeview
        self.scrollbar = ttk.Scrollbar(self.frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscroll=self.scrollbar.set)
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Botão para gerar o arquivo TXT
        self.generate_button = tk.Button(self.frame, text="Gerar TXT", command=self.generate_txt)
        self.generate_button.pack(pady=5)
        
        # Variável para armazenar o caminho da pasta selecionada
        self.folder_path = ""
    
    def select_folder(self):
        # Abre a janela para selecionar uma pasta
        self.folder_path = filedialog.askdirectory(title="Selecione a Pasta")
        if not self.folder_path:
            return
        
        # Limpa a Treeview
        self.tree.delete(*self.tree.get_children())
        
        # Percorre a pasta e adiciona os arquivos à Treeview
        for root, dirs, files in os.walk(self.folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                self.tree.insert("", tk.END, values=(file, file_path))
    
    def generate_txt(self):
        if not self.folder_path:
            messagebox.showwarning("Nenhuma pasta selecionada", "Por favor, selecione uma pasta primeiro.")
            return
        
        # Obtém os itens selecionados na Treeview
        selected_items = self.tree.selection()
        if not selected_items:
            messagebox.showwarning("Nenhum arquivo selecionado", "Por favor, selecione pelo menos um arquivo.")
            return
        
        # Cria o arquivo TXT
        output_file = "output.txt"
        with open(output_file, "w", encoding="utf-8") as f:
            for item in selected_items:
                file_path = self.tree.item(item, "values")[1]
                f.write(f"{file_path}\n")
                with open(file_path, "r", encoding="utf-8") as code_file:
                    f.write("Código:\n")
                    f.write(code_file.read())
                f.write("\n" + "="*50 + "\n")
        
        messagebox.showinfo("Sucesso", f"Arquivo {output_file} gerado com sucesso!")

if __name__ == "__main__":
    root = tk.Tk()
    app = App(root)
    root.mainloop()