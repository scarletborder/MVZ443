tmp = []
while 1:
    lines = input().splitlines()
    if len(lines) == 0:
        print("\n".join(tmp))
        tmp = []

    for l in lines:
        chars = l.split(",")
        chars[0] = str(int(chars[0]) + 1)
        tmp.append(",".join(chars))
