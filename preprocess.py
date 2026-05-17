import pandas as pd
import re

def clean_data(text):
    # Standardizing text for the AI
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    return text

# Load the file from your data folder
df = pd.read_csv("data/dataset.csv")

# Clean the text
df['text'] = df['text'].apply(clean_data)

# Save the cleaned version for Day 3
df.to_csv("data/cleaned_dataset.csv", index=False)

print("--- Day 2 Task Complete ---")
print("Cleaned data saved in data/cleaned_dataset.csv")
print(df.head())