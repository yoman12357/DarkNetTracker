import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, classification_report

# 1. Load Data
df = pd.read_csv("data/cleaned_dataset.csv")

# 2. Vectorization (Numbers)
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(df['text'])
y = df['label']

# 3. Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Train Model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# 5. EVALUATION (Day 4 Core Task)
predictions = model.predict(X_test)
print("--- Confusion Matrix ---")
print(confusion_matrix(y_test, predictions))
print("\n--- Detailed Metrics ---")
print(classification_report(y_test, predictions))

# 6. SAVE MODEL (Day 4 Core Task)
# We save both the model AND the vectorizer because the website needs to 
# turn new text into the SAME numbers the model learned.
joblib.dump(model, 'models/threat_detector_model.pkl')
joblib.dump(vectorizer, 'models/tfidf_vectorizer.pkl')

print("\nSuccess: Model and Vectorizer saved in 'models/' folder!")