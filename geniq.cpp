#include <cstdio>
#include <cstdint>
#include <vector>
#include <string>

using namespace std;

const int SAMPLE_RATE = 2000000;
const int SYMBOL_RATE = 2000;

vector<uint8_t> out_cu8;
vector<int8_t> out_cs8;

void generate_samples()
{
    string data = "101010101010101010101010100010101100101100110010110011001100110011001011010011010010110101001010110100110100110010101011010010110001010110010110011001011001100110011001100101101001101001011010100101011010011010011001010101101001011000101011001011001100101100110011001100110010110100110100101101010010101101001101001100101010110100101";
    int spb = SAMPLE_RATE / SYMBOL_RATE; // samples per bit
    for (int i = 0 ; i < (int) data.size() ; i++) {
        for (int j = 0 ; j < spb ; j++) {
            out_cu8.push_back(data[i] == '1' ? 255 : 127);
            out_cu8.push_back(127);
            out_cs8.push_back(data[i] == '1' ? 127 : 0);
            out_cs8.push_back(0);
        }
    }
}

template<typename T>
void save_to_file(const string &fname, vector<T> &out)
{
    printf("Saving to %s\n", fname.c_str());
    FILE *f = fopen(fname.c_str(), "wb");
    fwrite(out.data(), 1, out.size(), f);
    fclose(f);
}

int main(int argc, char *argv[])
{
    if (argc < 2) {
        printf("Usage: %s <fname>\n", argv[0]);
        return 1;
    }
    string fname = argv[1];
    generate_samples();
    save_to_file(fname + ".cu8", out_cu8);
    save_to_file(fname + ".cs8", out_cs8);
    return 0;
}
