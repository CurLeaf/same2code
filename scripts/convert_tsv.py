#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 categories.tsv 从 Shopify 格式转换为标准 TSV 格式

输入格式（Shopify）:
gid://shopify/TaxonomyCategory/ap                : 动物/宠物用品

输出格式（标准 TSV）:
category_id	category_text
gid://shopify/TaxonomyCategory/ap	动物/宠物用品
"""

import re
import sys
from pathlib import Path


def convert_shopify_tsv(input_path: str, output_path: str) -> None:
    """
    将 Shopify 格式的 TSV 转换为标准 TSV 格式
    
    Args:
        input_path: 输入文件路径
        output_path: 输出文件路径
    """
    input_file = Path(input_path)
    output_file = Path(output_path)
    
    if not input_file.exists():
        print(f"错误: 输入文件不存在 - {input_path}")
        sys.exit(1)
    
    # 正则匹配: gid://... 后面跟着空格和冒号，然后是类目文本
    # 格式: gid://shopify/TaxonomyCategory/xxx   : 类目路径
    pattern = re.compile(r'^(gid://[^\s]+)\s+:\s+(.+)$')
    
    converted_count = 0
    skipped_count = 0
    
    with open(input_file, 'r', encoding='utf-8') as f_in, \
         open(output_file, 'w', encoding='utf-8') as f_out:
        
        # 写入标题行
        f_out.write("category_id\tcategory_text\n")
        
        for line_num, line in enumerate(f_in, 1):
            line = line.rstrip('\n\r')
            
            # 跳过空行
            if not line.strip():
                continue
            
            # 跳过注释行（以 # 开头）
            if line.strip().startswith('#'):
                skipped_count += 1
                continue
            
            match = pattern.match(line)
            if match:
                category_id = match.group(1).strip()
                category_text = match.group(2).strip()
                
                # 写入 TSV 格式（Tab 分隔）
                f_out.write(f"{category_id}\t{category_text}\n")
                converted_count += 1
            else:
                print(f"警告: 第 {line_num} 行格式不匹配，已跳过: {line[:50]}...")
                skipped_count += 1
    
    print(f"转换完成!")
    print(f"  - 转换成功: {converted_count} 条")
    print(f"  - 已跳过: {skipped_count} 条")
    print(f"  - 输出文件: {output_path}")


def main():
    # 默认路径
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    input_path = project_root / "categories.tsv"
    output_path = project_root / "data" / "categories_standard.tsv"
    
    # 确保输出目录存在
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 支持命令行参数
    if len(sys.argv) >= 2:
        input_path = Path(sys.argv[1])
    if len(sys.argv) >= 3:
        output_path = Path(sys.argv[2])
    
    print(f"开始转换 TSV 文件...")
    print(f"  - 输入: {input_path}")
    print(f"  - 输出: {output_path}")
    print()
    
    convert_shopify_tsv(str(input_path), str(output_path))


if __name__ == "__main__":
    main()
