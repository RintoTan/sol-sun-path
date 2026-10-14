import sys, zlib, struct

def load_png(path):
    d = open(path,'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n', 'not a png'
    pos = 8; idat = b''; w=h=bd=ct=None
    while pos < len(d):
        ln, typ = struct.unpack('>I4s', d[pos:pos+8])
        body = d[pos+8:pos+8+ln]
        if typ == b'IHDR':
            w,h,bd,ct = struct.unpack('>IIBB', body[:10])
        elif typ == b'IDAT':
            idat += body
        elif typ == b'IEND':
            break
        pos += 12 + ln
    raw = zlib.decompress(idat)
    ch = {0:1,2:3,3:1,4:2,6:4}[ct]
    assert bd == 8, 'only 8-bit supported'
    stride = w*ch
    out = bytearray(h*stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        ft = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        if ft == 1:
            for i in range(ch, stride): line[i] = (line[i] + line[i-ch]) & 255
        elif ft == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif ft == 3:
            for i in range(stride):
                a = line[i-ch] if i >= ch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif ft == 4:
            for i in range(stride):
                a = line[i-ch] if i >= ch else 0
                b = prev[i]
                c = prev[i-ch] if i >= ch else 0
                pp = a+b-c; pa=abs(pp-a); pb=abs(pp-b); pc=abs(pp-c)
                pr = a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[i] = (line[i] + pr) & 255
        out[y*stride:(y+1)*stride] = line
        prev = line
    return w, h, ch, out

w,h,ch,px = load_png(sys.argv[1])
print(f'{sys.argv[1]}: {w}x{h}, channels={ch}')

def sample(x, y, label):
    o = (y*w + x)*ch
    r,g,b = px[o], px[o+1], px[o+2]
    a = px[o+3] if ch == 4 else 255
    print(f'  {label:26} ({x:4},{y:4})  rgb({r:3},{g:3},{b:3})  a={a}')

print('\n-- background samples --')
for (x,y,l) in [(10,300,'page bg upper'), (10,1200,'page bg mid'),
                (10,1700,'page bg lower'), (860,2600,'page bg bottom-right'),
                (440,760,'readout panel bg'), (440,2050,'control panel bg'),
                (300,2870,'strip panel bg')]:
    if y < h and x < w: sample(x,y,l)

print('\n-- dome interior --')
for (x,y,l) in [(440,270,'dome top (inside ring)'), (440,640,'dome center=zenith'),
                (440,700,'just below zenith'), (440,560,'fan band'),
                (100,560,'dome left edge'), (440,1100,'dome bottom')]:
    if y < h and x < w: sample(x,y,l)

print('\n-- headline / accents --')
best = (0,0,0); bp = (0,0)
for y in range(60, 200):
    for x in range(60, 260):
        o = (y*w+x)*ch
        s = px[o]+px[o+1]+px[o+2]
        if s > best[0]: best=(s,(px[o],px[o+1],px[o+2])); bp=(x,y)
print(f'  brightest pixel in header area: rgb{best[1]} at {bp}')
