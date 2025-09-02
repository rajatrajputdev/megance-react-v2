#include <iostream> // For input/output operations like std::cout
#include <vector>
using namespace std;
void selectionSort(vector<int> &arr)
{
    for (int i = 0; i < arr.size() - 1; i++)
    {
        int minIndex = i;
        for (int j = i + 1; j < arr.size(); j++)
        {
            if (arr[j] < arr[minIndex])
                minIndex = j;
        }
        swap(arr[minIndex], arr[i]);
    }
};
double findMedianSortedArrays(vector<int> &nums1, vector<int> &nums2)
{
    vector<int> nums3;
    for (int i : nums1)
    {
        nums3.push_back(i);
    }
    for (int i : nums2)
    {
        nums3.push_back(i);
    }
    double median;
    int size = nums3.size();
    selectionSort(nums3);
    cout << (nums3[size / 2] + nums3[size / 2 - 1]) / 2;;
    cout << nums3[size / 2]; 
    if (size % 2 == 0)
    {
        median = (nums3[size / 2] + nums3[size / 2 - 1]) / 2;
    }
    else
        median = nums3[size / 2];
    return median;
}
int main()
{
    return 0;
}