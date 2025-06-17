# Wynnbuilder Encoding

Wynnbuilder uses a combination of binary and Base64 encoding to encode builds without the need for a server.

## Inner workings
Wynnbuilder is designed to always be backwards compatible - meaning you can always open any valid link created at any point.
after opening the link the encoder re-encodes it to the latest encoding scheme, so legacy links will automatically get
re-encoded to modernized ones.

## Spec

### Legacy VS Binary encoding

Legacy encoding is prefixed by an "\<V\>_" string where `V` is in the range of [0..11], encoded in decimal.
To differentiate itself from legacy encoding, binary encoding encodes the first 6 bits of the string to some number x such that x > 11.

When decoding the hash, the decoder must first read the first 6 bits (1 Base64 character) to determine whether to parse using legacy encoding 
or binary encoding.
