def iterate_with_confirmation():
    """Demonstrates a loop that continues based on user input."""

    while True:
        # Do some work here
        print("Performing iteration...")

        # Ask user if they want to continue
        response = input("Continue to iterate? (y/n): ")

        # Check if we should stop
        if response.lower() != 'y':
            print("Iteration stopped.")
            break

if __name__ == "__main__":
    iterate_with_confirmation()
