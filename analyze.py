import pandas as pd

# Load the collected network traffic data
df = pd.read_csv("data/network_features.csv")

print("\n--- Network Traffic Analysis Report ---\n")

# 1. Basic dataset info
print("[1] Dataset Overview")
print(f"Total packets captured: {len(df)}\n")

# 2. Packet length statistics
print("[2] Packet Length Statistics")
print(f"Average packet length: {df['packet_length'].mean():.2f}")
print(f"Maximum packet length: {df['packet_length'].max()}")
print(f"Minimum packet length: {df['packet_length'].min()}\n")

# 3. Protocol distribution
print("[3] Protocol Distribution")
protocol_counts = df['protocol'].value_counts()
print(protocol_counts, "\n")

# 4. Most common source ports
print("[4] Top 10 Source Ports")
print(df['src_port'].value_counts().head(10), "\n")

# 5. Most common destination ports
print("[5] Top 10 Destination Ports")
print(df['dst_port'].value_counts().head(10), "\n")

print("--- End of Report ---")
import matplotlib.pyplot as plt

# Plot protocol distribution
protocol_counts.plot(kind='bar', title='Protocol Distribution')
plt.xlabel('Protocol')
plt.ylabel('Packet Count')
plt.show()
