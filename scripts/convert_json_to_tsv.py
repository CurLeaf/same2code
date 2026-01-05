#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert ozon.json and yandex.json to TSV format
Output format matches shopify.tsv: category_id\tcategory_text
"""

import json
import os

def flatten_ozon_categories(data, parent_path=""):
    """
    Flatten ozon.json hierarchical structure to list of (id, path) tuples
    
    ozon.json structure:
    - result[]: top-level categories with description_category_id, category_name
    - children[]: may have description_category_id/category_name OR type_id/type_name
    """
    results = []
    
    for item in data:
        # Get current item's id and name
        if "description_category_id" in item:
            item_id = item["description_category_id"]
            item_name = item["category_name"]
        elif "type_id" in item:
            item_id = item["type_id"]
            item_name = item["type_name"]
        else:
            continue
        
        # Skip disabled items
        if item.get("disabled", False):
            continue
        
        # Build full path
        if parent_path:
            full_path = f"{parent_path} > {item_name}"
        else:
            full_path = item_name
        
        # Add current item
        results.append((item_id, full_path))
        
        # Recursively process children
        children = item.get("children", [])
        if children:
            results.extend(flatten_ozon_categories(children, full_path))
    
    return results


def flatten_yandex_categories(data, parent_path=""):
    """
    Flatten yandex.json hierarchical structure to list of (id, path) tuples
    
    yandex.json structure:
    - result: root node with id, name, children
    - children[]: nodes with id, name, optional children
    """
    results = []
    
    # Handle root node
    if isinstance(data, dict):
        item_id = data.get("id")
        item_name = data.get("name")
        
        if item_id and item_name:
            # Build full path
            if parent_path:
                full_path = f"{parent_path} > {item_name}"
            else:
                full_path = item_name
            
            # Add current item
            results.append((item_id, full_path))
            
            # Recursively process children
            children = data.get("children", [])
            for child in children:
                results.extend(flatten_yandex_categories(child, full_path))
    
    return results


def convert_ozon_to_tsv(input_path, output_path):
    """Convert ozon.json to TSV format"""
    print(f"Reading {input_path}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get the result array
    categories = data.get("result", [])
    
    # Flatten the hierarchy
    flattened = flatten_ozon_categories(categories)
    
    print(f"Found {len(flattened)} categories")
    
    # Write to TSV
    with open(output_path, 'w', encoding='utf-8') as f:
        # Write header
        f.write("category_id\tcategory_text\n")
        
        # Write data rows
        for item_id, path in flattened:
            f.write(f"{item_id}\t{path}\n")
    
    print(f"Written to {output_path}")
    return len(flattened)


def convert_yandex_to_tsv(input_path, output_path):
    """Convert yandex.json to TSV format"""
    print(f"Reading {input_path}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get the result object
    result = data.get("result", {})
    
    # Skip root node "All products" and start from its children
    flattened = []
    children = result.get("children", [])
    for child in children:
        flattened.extend(flatten_yandex_categories(child))
    
    print(f"Found {len(flattened)} categories")
    
    # Write to TSV
    with open(output_path, 'w', encoding='utf-8') as f:
        # Write header
        f.write("category_id\tcategory_text\n")
        
        # Write data rows
        for item_id, path in flattened:
            f.write(f"{item_id}\t{path}\n")
    
    print(f"Written to {output_path}")
    return len(flattened)


def main():
    # Get script directory and data directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(os.path.dirname(script_dir), 'data')
    
    # Convert ozon.json
    ozon_input = os.path.join(data_dir, 'ozon.json')
    ozon_output = os.path.join(data_dir, 'ozon.tsv')
    ozon_count = convert_ozon_to_tsv(ozon_input, ozon_output)
    
    print()
    
    # Convert yandex.json
    yandex_input = os.path.join(data_dir, 'yandex.json')
    yandex_output = os.path.join(data_dir, 'yandex.tsv')
    yandex_count = convert_yandex_to_tsv(yandex_input, yandex_output)
    
    print()
    print("=" * 50)
    print(f"Conversion complete!")
    print(f"  ozon.tsv: {ozon_count} categories")
    print(f"  yandex.tsv: {yandex_count} categories")


if __name__ == "__main__":
    main()
