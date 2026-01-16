from scapy.all import sniff, IP, TCP
import pandas as pd
import time

# This list will hold our "Features"
features_list = []

def packet_callback(packet):
    if IP in packet:
        # Define the features we want to track
        feature = {
            "timestamp": time.time(),
            "packet_length": len(packet),
            "protocol": packet[IP].proto,
            "src_port": packet[TCP].sport if TCP in packet else 0,
            "dst_port": packet[TCP].dport if TCP in packet else 0,
        }
        features_list.append(feature)
        print(f"[+] Captured Packet: Size {feature['packet_length']} | Protocol {feature['protocol']}")

# Let's capture 200 packets for your first test
print("--- Starting Network Sniffer ---")
print("Action: Open your browser and visit a few sites (or Tor) now.")

try:
    # count=200 means it will stop automatically after 200 packets
    sniff(prn=packet_callback, count=200)
except PermissionError:
    print("\n[!] ERROR: You must run this as Administrator/Sudo to sniff network traffic.")

# Save the data to show the professor
df = pd.DataFrame(features_list)
df.to_csv("training_data.csv", index=False)
print("\n--- Success! Data saved to training_data.csv ---")