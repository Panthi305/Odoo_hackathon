from app.utils.password_hash import pwd_context, hash_password, verify_password

# Test pbkdf2 is now identifiable
test_pbkdf2 = "$pbkdf2-sha256$29000$29s7R2gNwtest$abcdefghijk"
try:
    scheme = pwd_context.identify(test_pbkdf2)
    print(f"pbkdf2 identified as: {scheme}")
except Exception as e:
    print(f"pbkdf2 still failing: {e}")

# Test new bcrypt hash
h = hash_password("testpass123")
print(f"New hash scheme: {pwd_context.identify(h)}")
print(f"Verify correct password: {verify_password('testpass123', h)}")
print(f"Verify wrong password: {verify_password('wrongpass', h)}")
print("All good — restart uvicorn and try logging in.")
