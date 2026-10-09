#include <iostream>
using namespace std;

struct Node {
    int data;
    Node* prev;
    Node* next;

    Node(int value) {
        data = value;
        prev = nullptr;
        next = nullptr;
    }
};

class DoublyLinkedList {
private:
    Node* head;
    Node* tail;

public:

    DoublyLinkedList() {
        head = nullptr;
        tail = nullptr;
    }

    // Insert at beginning
    void insertAtBeginning(int value) {

        Node* newNode = new Node(value);

        // Empty list
        if (head == nullptr) {
            head = tail = newNode;
            return;
        }

        newNode->next = head;
        head->prev = newNode;
        head = newNode;
    }

    // Insert at end
    void insertAtEnd(int value) {

        Node* newNode = new Node(value);

        // Empty list
        if (head == nullptr) {
            head = tail = newNode;
            return;
        }

        newNode->prev = tail;
        tail->next = newNode;
        tail = newNode;
    }

    // Insert at required position
    // Position is 1-based
    void insertAtPosition(int value, int pos) {

        if (pos <= 0) {
            cout << "Invalid position\n";
            return;
        }

        // Position 1 = beginning
        if (pos == 1) {
            insertAtBeginning(value);
            return;
        }

        Node* curr = head;

        // Move to node at position pos - 1
        for (int i = 1; i < pos - 1 && curr != nullptr; i++) {
            curr = curr->next;
        }

        // Position doesn't exist
        if (curr == nullptr) {
            cout << "Invalid position\n";
            return;
        }

        // Insert at end
        if (curr == tail) {
            insertAtEnd(value);
            return;
        }

        Node* newNode = new Node(value);

        // Connect new node
        newNode->prev = curr;
        newNode->next = curr->next;

        // Fix next node's prev
        curr->next->prev = newNode;

        // Fix current node's next
        curr->next = newNode;
    }

    // Delete from beginning
    void deleteFromBeginning() {

        if (head == nullptr) {
            cout << "List is empty\n";
            return;
        }

        Node* temp = head;

        // Only one node
        if (head == tail) {
            head = tail = nullptr;
        }
        else {
            head = head->next;
            head->prev = nullptr;
        }

        delete temp;
    }

    // Delete from end
    void deleteFromEnd() {

        if (tail == nullptr) {
            cout << "List is empty\n";
            return;
        }

        Node* temp = tail;

        // Only one node
        if (head == tail) {
            head = tail = nullptr;
        }
        else {
            tail = tail->prev;
            tail->next = nullptr;
        }

        delete temp;
    }

    // Delete from required position
    // Position is 1-based
    void deleteAtPosition(int pos) {

        if (head == nullptr) {
            cout << "List is empty\n";
            return;
        }

        if (pos <= 0) {
            cout << "Invalid position\n";
            return;
        }

        // Delete first node
        if (pos == 1) {
            deleteFromBeginning();
            return;
        }

        Node* curr = head;

        // Find node at position pos
        for (int i = 1; i < pos && curr != nullptr; i++) {
            curr = curr->next;
        }

        if (curr == nullptr) {
            cout << "Invalid position\n";
            return;
        }

        // Delete last node
        if (curr == tail) {
            deleteFromEnd();
            return;
        }

        // Connect previous and next nodes
        curr->prev->next = curr->next;
        curr->next->prev = curr->prev;

        delete curr;
    }

    // Display forward
    void displayForward() {

        Node* curr = head;

        while (curr != nullptr) {
            cout << curr->data << " ";
            curr = curr->next;
        }

        cout << endl;
    }

    // Display backward
    void displayBackward() {

        Node* curr = tail;

        while (curr != nullptr) {
            cout << curr->data << " ";
            curr = curr->prev;
        }

        cout << endl;
    }

    // Reverse the doubly linked list
    void reverse() {

        Node* curr = head;

        while (curr != nullptr) {

            // Swap prev and next
            Node* temp = curr->prev;
            curr->prev = curr->next;
            curr->next = temp;

            // Move to next node in original list
            curr = curr->prev;
        }

        // Swap head and tail
        Node* temp = head;
        head = tail;
        tail = temp;
    }
};

int main() {

    DoublyLinkedList list;

    // Insert at beginning
    list.insertAtBeginning(20);
    list.insertAtBeginning(10);

    // Insert at end
    list.insertAtEnd(40);
    list.insertAtEnd(50);

    // Current list:
    // 10 <-> 20 <-> 40 <-> 50

    cout << "Original list: ";
    list.displayForward();


    // Insert 30 at position 3
    list.insertAtPosition(30, 3);

    cout << "After inserting 30 at position 3: ";
    list.displayForward();


    // Display backwards
    cout << "Backward: ";
    list.displayBackward();


    // Delete position 3
    list.deleteAtPosition(3);

    cout << "After deleting position 3: ";
    list.displayForward();


    // Delete first
    list.deleteFromBeginning();

    cout << "After deleting first: ";
    list.displayForward();


    // Delete last
    list.deleteFromEnd();

    cout << "After deleting last: ";
    list.displayForward();


    // Reverse
    list.reverse();

    cout << "After reversing: ";
    list.displayForward();

    return 0;
}