import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# 1. Load the cleaned data from Day 2
df = pd.read_csv("data/cleaned_dataset.csv")

# 2. Convert Text to Numbers (TF-IDF)
# This creates a "vector" for every word
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(df['text']) # Our "Features"
y = df['label'] # Our "Target" (0 or 1)

# 3. Split Data: 80% for Training, 20% for Testing
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Initialize and Train the Model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# 5. Test the Model
predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)

print(f"--- Day 3 ML Test Complete ---")
print(f"Model Accuracy: {accuracy * 100}%")

# 6. Try a manual test
test_sentence = ["How to bypass login using SQL"]
test_vector = vectorizer.transform(test_sentence)
prediction = model.predict(test_vector)

result = "MALICIOUS" if prediction[0] == 1 else "BENIGN"
print(f"Test Input: '{test_sentence[0]}' -> Result: {result}")