#!/bin/xonsh
from datetime import datetime

# Get the current date
now = datetime.now()

# Format the date as per your needs
formatted_date = now.strftime('%Y-%m-%d')

# Open the file in write mode
with open('lastUpdate.txt', 'w') as file:
    # Write the formatted date to the file
    file.write(formatted_date)

git add lastUpdate.txt
git commit -m "Force to build "
git push origin main
