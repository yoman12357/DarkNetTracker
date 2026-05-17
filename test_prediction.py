import joblib

# 1. Load the "Brain" and the "Translator" (Vectorizer)
model = joblib.load('models/threat_detector_model.pkl')
vectorizer = joblib.load('models/tfidf_vectorizer.pkl')

def predict_threat(user_input):
    # 2. Convert the new text into numbers just like the training data
    input_vector = vectorizer.transform([user_input])
    
    # 3. Get the prediction (0 or 1)
    prediction = model.predict(input_vector)[0]
    
    # 4. Get the probability (confidence score)
    # This gives us [prob_of_0, prob_of_1]
    probability = model.predict_proba(input_vector)[0]
    confidence = probability[prediction] * 100

    result = "MALICIOUS" if prediction == 1 else "BENIGN"
    return result, confidence

# --- Manual Testing ---
print("--- Dark Net Threat Detector Test ---")
while True:
    text = input("\nEnter a sentence to scan (or 'exit' to quit): ")
    if text.lower() == 'exit':
        break
    
    label, conf = predict_threat(text)
    print(f"Result: {label} | Confidence: {conf:.2f}%")