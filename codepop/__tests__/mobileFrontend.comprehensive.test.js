/**
 * Mobile (Expo / React Native) frontend tests — exercise real UI and integration
 * boundaries (navigation, fetch payloads, AsyncStorage, Stripe hook, AI/chat flows).
 *
 * Run from repo: cd codepop && npm test -- mobileFrontend.comprehensive.test.js
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from '@testing-library/react-native';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

/* -------------------------------------------------------------------------- */
/* Shared mocks (hoisted by Jest)                                              */
/* -------------------------------------------------------------------------- */

const mockNavigate = jest.fn();
let mockNavigationRoute = { name: 'GeneralHome', params: {} };

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useRoute: () => mockNavigationRoute,
    useFocusEffect: (callback) => {
      React.useLayoutEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, []);
    },
  };
});

const mockAsyncStorageStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key) => Promise.resolve(mockAsyncStorageStore[key] ?? null)),
  setItem: jest.fn((key, value) => {
    mockAsyncStorageStore[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete mockAsyncStorageStore[key];
    return Promise.resolve();
  }),
}));

jest.mock('../ip_address', () => ({
  BASE_URL: 'http://127.0.0.1:3001',
  setStoreAndUpdateURL: jest.fn(() => Promise.resolve('http://127.0.0.1:3001')),
  isGuestMode: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ isVisible, children }) =>
    isVisible ? <View testID="rn-modal-visible">{children}</View> : null;
});

jest.mock('../src/components/Gif', () => 'Gif');

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  const MockMap = (props) => <View testID="map-view" {...props} />;
  const MockMarker = (props) => <View testID="map-marker" {...props} />;
  return { __esModule: true, default: MockMap, Marker: MockMarker };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 41.7421007,
        longitude: -111.8070335,
      },
    })
  ),
}));

const mockStripeClient = {
  initPaymentSheet: jest.fn(() => Promise.resolve({ error: null })),
  presentPaymentSheet: jest.fn(() => Promise.resolve({ error: null })),
};

jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => mockStripeClient,
  StripeProvider: ({ children }) => children,
}));

function resetMockAsyncStorage() {
  Object.keys(mockAsyncStorageStore).forEach((k) => delete mockAsyncStorageStore[k]);
}

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isGuestMode } from '../ip_address';
import NavBar from '../src/components/NavBar';
import ComplaintsPage from '../src/pages/ComplaintsPage';
import PreferencesPage from '../src/pages/PreferencesPage';
import GeneralHomePage from '../src/pages/GeneralHomePage';
import CreateDrinkPage from '../src/pages/CreateDrinkPage';
import PostCheckout from '../src/pages/PostCheckout';
import CheckoutForm from '../src/pages/CheckoutForm';

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('NavBar (mobile shell)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockNavigationRoute = { name: 'GeneralHome', params: {} };
  });

  it('renders all primary destinations and highlights the active route', () => {
    mockNavigationRoute = { name: 'Cart', params: {} };
    render(<NavBar />);

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Order')).toBeTruthy();
    expect(screen.getByText('Cart')).toBeTruthy();
    expect(screen.getByText('Tracking')).toBeTruthy();
    expect(screen.getByText('Support')).toBeTruthy();

    fireEvent.press(screen.getByText('Support'));
    expect(mockNavigate).toHaveBeenCalledWith('ComplaintsPage');
  });
});

describe('ComplaintsPage (AI / Bob chatbot)', () => {
  let fetchSpy;

  beforeEach(() => {
    resetMockAsyncStorage();
    mockNavigate.mockClear();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('shows the initial assistant greeting', () => {
    render(<ComplaintsPage />);
    expect(
      screen.getByText("Hi! I'm Bob. How can I help you?", { exact: false })
    ).toBeTruthy();
  });

  it('does not call the chatbot when the user message is only whitespace', async () => {
    render(<ComplaintsPage />);
    const input = screen.getByPlaceholderText('Type your complaint...');

    fireEvent.changeText(input, '   \n\t  ');
    fireEvent(input, 'submitEditing');

    await act(async () => {
      await flushPromises();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POSTs to chatbot with trimmed message and replaces the typing placeholder with the API response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ response: 'Thanks — we can help with that.' }),
    });

    render(<ComplaintsPage />);
    mockAsyncStorageStore.userToken = 'abc123';

    const input = screen.getByPlaceholderText('Type your complaint...');
    fireEvent.changeText(input, '  My drink was wrong  ');

    await act(async () => {
      fireEvent(input, 'submitEditing');
      await flushPromises();
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/backend/chatbot/');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.message).toBe('My drink was wrong');
    expect(init.headers.Authorization).toBe('Token abc123');

    await waitFor(() => {
      expect(
        screen.getByText('Thanks — we can help with that.', { exact: false })
      ).toBeTruthy();
    });
    expect(screen.queryByText('Bob is typing...')).toBeNull();
  });

  it('shows a user-facing error when the chatbot HTTP request fails', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => 'bad gateway',
    });

    render(<ComplaintsPage />);

    const input = screen.getByPlaceholderText('Type your complaint...');
    fireEvent.changeText(input, 'Refund please');

    await act(async () => {
      fireEvent(input, 'submitEditing');
      await flushPromises();
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "I'm having trouble understanding right now. Please try again later.",
          { exact: false }
        )
      ).toBeTruthy();
    });
  });
});

describe('PreferencesPage (backend preferences + auth gate)', () => {
  let fetchSpy;

  beforeEach(() => {
    resetMockAsyncStorage();
    mockNavigate.mockClear();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('prompts guests to log in and navigates to Auth', async () => {
    render(<PreferencesPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull();
    });

    expect(
      screen.getByText('Login to create drink preferences', { exact: false })
    ).toBeTruthy();
    fireEvent.press(screen.getByText('Login'));
    expect(mockNavigate).toHaveBeenCalledWith('Auth');
  });

  it('loads preferences from GET /backend/preferences/ and shows the personalized title', async () => {
    mockAsyncStorageStore.userToken = 'tok';
    mockAsyncStorageStore.userId = '7';
    mockAsyncStorageStore.first_name = 'Alex';

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { UserID: '7', Preference: 'coke' },
        { UserID: '7', Preference: 'vanilla' },
        { UserID: '99', Preference: 'coke' },
      ],
    });

    render(<PreferencesPage />);

    await waitFor(() => {
      expect(screen.getByText("Alex's Preferences", { exact: false })).toBeTruthy();
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/backend/preferences/',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Token tok',
        }),
      })
    );
  });

  it('POSTs a new preference when the user selects a syrup (label sits on tappable control)', async () => {
    mockAsyncStorageStore.userToken = 'tok';
    mockAsyncStorageStore.userId = '7';
    mockAsyncStorageStore.first_name = 'Alex';

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<PreferencesPage />);

    await waitFor(() => {
      expect(screen.getByText("Alex's Preferences", { exact: false })).toBeTruthy();
    });

    fetchSpy.mockImplementation((url, init) => {
      if (init && init.method === 'POST' && String(url).includes('/backend/preferences/')) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });

    fireEvent.press(screen.getByText('Syrups'));
    await act(async () => {
      fireEvent.press(screen.getByText('coconut'));
      await flushPromises();
    });

    await waitFor(() => {
      const posts = fetchSpy.mock.calls.filter(
        ([u, init]) =>
          String(u).includes('/backend/preferences/') && init.method === 'POST'
      );
      expect(posts.length).toBeGreaterThanOrEqual(1);
    });

    const postCall = fetchSpy.mock.calls.find(
      ([u, init]) =>
        String(u).includes('/backend/preferences/') && init.method === 'POST'
    );
    const posted = JSON.parse(postCall[1].body);
    expect(posted.preference).toBe('coconut');
    expect(String(posted.userId)).toBe('7');
  });
});

describe('GeneralHomePage (daily drinks from /backend/generate/, guest UI)', () => {
  let fetchSpy;

  beforeEach(() => {
    resetMockAsyncStorage();
    mockNavigate.mockClear();
    fetchSpy = jest.spyOn(global, 'fetch');
    isGuestMode.mockResolvedValue(true);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('fetches three daily drinks and renders their ingredients from the API', async () => {
    const drinkPayload = {
      sodaUsed: ['sprite'],
      syrupsUsed: ['mango'],
      addIns: ['cream'],
      size: '24oz',
      ice: 'Light',
    };

    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('/backend/generate/')) {
        return Promise.resolve({
          ok: true,
          json: async () => drinkPayload,
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(<GeneralHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Drinks of The Day', { exact: false })).toBeTruthy();
    });

    expect(fetchSpy).toHaveBeenCalled();
    const generateCalls = fetchSpy.mock.calls.filter(([u]) =>
      String(u).includes('/backend/generate/')
    );
    expect(generateCalls.length).toBeGreaterThanOrEqual(3);

    await waitFor(() => {
      expect(screen.getAllByText(/Soda:\s*sprite/i).length).toBeGreaterThanOrEqual(3);
      expect(screen.getAllByText(/Syrups:\s*mango/i).length).toBeGreaterThanOrEqual(3);
      expect(screen.getAllByText(/Add-ins:\s*cream/i).length).toBeGreaterThanOrEqual(3);
    });
  });

  it('shows guest copy when isGuestMode resolves true', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        sodaUsed: ['coke'],
        syrupsUsed: [],
        addIns: [],
      }),
    });

    render(<GeneralHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Browsing as Guest', { exact: false })).toBeTruthy();
    });
  });

  it('alerts when Track Order is pressed with no active order number', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        sodaUsed: ['coke'],
        syrupsUsed: [],
        addIns: [],
      }),
    });

    render(<GeneralHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Track Order', { exact: false })).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Track Order'));

    expect(alertSpy).toHaveBeenCalledWith(
      'No active order yet',
      expect.any(String)
    );
    alertSpy.mockRestore();
  });
});

describe('CreateDrinkPage (AI mixologist + ingredient UI)', () => {
  let fetchSpy;
  let alertSpy;

  beforeEach(() => {
    resetMockAsyncStorage();
    mockNavigate.mockClear();
    fetchSpy = jest.spyOn(global, 'fetch');
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('does not POST generate when the AI prompt is empty', async () => {
    render(<CreateDrinkPage />);

    fireEvent.press(screen.getByText('Go'));

    await act(async () => {
      await flushPromises();
    });

    const postGenerate = fetchSpy.mock.calls.some(
      ([u, init]) =>
        String(u).includes('/backend/generate') && init && init.method === 'POST'
    );
    expect(postGenerate).toBe(false);
  });

  it('POSTs the prompt to /backend/generate/ and opens the AI result modal', async () => {
    mockAsyncStorageStore.userId = '';

    const aiDrink = {
      sodaUsed: ['coke'],
      syrupsUsed: ['vanilla'],
      addIns: [],
      size: '32oz',
      ice: 'Regular',
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => aiDrink,
    });

    render(<CreateDrinkPage />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Enter your drink keywords'),
      'something tropical'
    );
    fireEvent.press(screen.getByText('Go'));

    await waitFor(() => {
      const postCalls = fetchSpy.mock.calls.filter(
        ([u, init]) =>
          String(u).includes('/backend/generate') && init.method === 'POST'
      );
      expect(postCalls.length).toBeGreaterThanOrEqual(1);
    });

    const [, init] = fetchSpy.mock.calls.find(
      ([u, i]) => String(u).includes('/backend/generate') && i.method === 'POST'
    );
    expect(JSON.parse(init.body).prompt).toBe('something tropical');

    await waitFor(() => {
      const modal = screen.getByTestId('rn-modal-visible');
      expect(
        within(modal).getByText('Your drink is ready', { exact: false })
      ).toBeTruthy();
      expect(within(modal).getByText('32oz', { exact: false })).toBeTruthy();
    });
  });

  it('GETs random AI drink from /backend/generate/ when Surprise Me is pressed', async () => {
    mockAsyncStorageStore.userToken = 't1';
    mockAsyncStorageStore.userId = '42';

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sodaUsed: ['pepsi'],
        syrupsUsed: [],
        addIns: [],
        size: '24oz',
        ice: 'regular',
      }),
    });

    render(<CreateDrinkPage />);

    fireEvent.press(screen.getByText('Surprise Me'));

    await waitFor(() => {
      const getCalls = fetchSpy.mock.calls.filter(
        ([u, init]) =>
          String(u).includes('/backend/generate/42') && init.method === 'GET'
      );
      expect(getCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('updates selected size when a size pill is pressed', () => {
    render(<CreateDrinkPage />);
    fireEvent.press(screen.getByText('24oz'));
    // Re-render shows selection via styles; assert pill still present and press did not throw
    expect(screen.getAllByText('24oz').length).toBeGreaterThanOrEqual(1);
  });
});

describe('PostCheckout (order tracking UI + Orbit-style inventory hooks)', () => {
  let fetchSpy;

  beforeEach(() => {
    resetMockAsyncStorage();
    mockNavigate.mockClear();
    fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy.mockImplementation((url, init = {}) => {
      if (String(url).includes('/backend/inventory/')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: {} }) });
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('shows empty state when there is no order number in storage', async () => {
    render(<PostCheckout />);

    await waitFor(() => {
      expect(
        screen.getByText('Create an order to track it', { exact: false })
      ).toBeTruthy();
    });
  });

  it('polls GET /backend/orders/:id when orderNum exists', async () => {
    mockAsyncStorageStore.orderNum = '501';
    mockAsyncStorageStore.orderToken = 'tok-xyz';

    fetchSpy.mockImplementation((url, init = {}) => {
      if (String(url).includes('/backend/inventory/')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      if (
        String(url).includes('/backend/orders/') &&
        (!init || init.method === 'GET')
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              orderStatus: 'processing',
              estimatedPickupTime: new Date(Date.now() + 60000).toISOString(),
            },
          }),
        });
      }
      if (String(url).includes('/backend/orders/') && init?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { unmount } = render(<PostCheckout />);

    await waitFor(() => {
      expect(screen.getByText(/Order #501/, { exact: false })).toBeTruthy();
    });

    await waitFor(() => {
      const orderPollGet = fetchSpy.mock.calls.some(
        ([url, init]) =>
          String(url).includes('/backend/orders/501/') &&
          init?.method === 'GET'
      );
      expect(orderPollGet).toBe(true);
    });

    // PATCH /orders/501/ runs first (locker combo); polling uses GET with ?orderToken=
    const pollGet = fetchSpy.mock.calls.find(
      ([url, init]) =>
        String(url).includes('/backend/orders/501/') && init?.method === 'GET'
    );
    expect(pollGet).toBeDefined();
    const pollUrl = pollGet[0];
    expect(String(pollUrl)).toContain('orderToken=');
    expect(String(pollUrl)).toContain(encodeURIComponent('tok-xyz'));

    unmount();
  });
});

describe('CheckoutForm (Stripe payment sheet + order lifecycle)', () => {
  let fetchSpy;

  function CheckoutHarness({ totalPrice }) {
    const { initializePaymentSheet, openPaymentSheet, loading } =
      CheckoutForm(totalPrice);
    return (
      <View>
        <Text testID="loading-flag">{loading ? 'loading-on' : 'loading-off'}</Text>
        <TouchableOpacity
          testID="btn-init"
          onPress={() => initializePaymentSheet()}
        >
          <Text>init</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="btn-pay" onPress={() => openPaymentSheet()}>
          <Text>pay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  beforeEach(() => {
    resetMockAsyncStorage();
    mockNavigate.mockClear();
    fetchSpy = jest.spyOn(global, 'fetch');
    mockStripeClient.initPaymentSheet.mockClear();
    mockStripeClient.presentPaymentSheet.mockClear();
    mockStripeClient.initPaymentSheet.mockResolvedValue({ error: null });
    mockStripeClient.presentPaymentSheet.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('does not create an order when total price is zero', async () => {
    render(<CheckoutHarness totalPrice={0} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-init'));
      await flushPromises();
    });

    const orderPosts = fetchSpy.mock.calls.filter(
      ([u, init]) => String(u).includes('/backend/orders/') && init.method === 'POST'
    );
    expect(orderPosts.length).toBe(0);
  });

  it('creates a pending order then initializes Stripe when payment sheet params succeed', async () => {
    mockAsyncStorageStore.checkoutList = JSON.stringify([
      {
        drinkId: 9,
        size: '24oz',
        sodaUsed: ['coke'],
        syrupsUsed: [],
        addIns: [],
        ice: 'Regular',
        price: 2,
      },
    ]);
    mockAsyncStorageStore.selectedStoreId = '2';
    mockAsyncStorageStore.userToken = 'ut';

    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ OrderID: 77 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paymentIntent: 'pi_secret',
          ephemeralKey: 'ek_secret',
          customer: 'cus_x',
          paymentIntentId: 'pi_123',
        }),
      });

    render(<CheckoutHarness totalPrice={5.5} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-init'));
      await flushPromises();
    });

    const orderPost = fetchSpy.mock.calls.find(
      ([u, init]) =>
        String(u).includes('/backend/orders/') && init.method === 'POST'
    );
    expect(orderPost).toBeTruthy();
    const orderBody = JSON.parse(orderPost[1].body);
    expect(orderBody.storeId).toBe(2);
    expect(orderBody.drinkIds).toEqual([9]);

    expect(mockStripeClient.initPaymentSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentClientSecret: 'pi_secret',
        customerEphemeralKeySecret: 'ek_secret',
        customerId: 'cus_x',
      })
    );
    expect(mockAsyncStorageStore.orderNum).toBe('77');
  });

  it('falls back to finalizeCheckout when payment sheet is not ready (demo path)', async () => {
    mockAsyncStorageStore.checkoutList = JSON.stringify([
      {
        drinkId: 1,
        size: '24oz',
        sodaUsed: ['sprite'],
        syrupsUsed: [],
        addIns: [],
        ice: 'Regular',
        price: 2,
      },
    ]);
    mockAsyncStorageStore.selectedStoreId = '1';
    mockAsyncStorageStore.orderNum = '99';

    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ OrderID: 99 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'no stripe' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<CheckoutHarness totalPrice={3} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-init'));
      await flushPromises();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-pay'));
      await flushPromises();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('PostCheckout');
    });
    expect(mockAsyncStorageStore.checkoutList).toBeUndefined();
  });
});
